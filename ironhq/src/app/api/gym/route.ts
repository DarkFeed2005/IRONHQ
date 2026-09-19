import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/app/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create-member"),
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254).toLowerCase(),
    plan: z.enum(["Essential", "Pro", "Elite"]),
  }),
  z.object({
    action: z.literal("check-in"),
    memberId: z.string().uuid(),
  }),
]);

const querySchema = z.object({
  search: z.string().trim().max(100).default(""),
  cursor: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  const input = querySchema.safeParse({
    search: request.nextUrl.searchParams.get("search") ?? "",
    cursor: request.nextUrl.searchParams.get("cursor") ?? undefined,
  });

  if (!input.success) {
    return NextResponse.json({ error: "Invalid query." }, { status: 400 });
  }

  const { search, cursor } = input.data;

  try {
    const [members, stats] = await Promise.all([
      db.query(
        `SELECT m.*,
          EXISTS (
            SELECT 1 FROM check_ins c
            WHERE c.member_id = m.id
              AND c.day = (now() AT TIME ZONE 'UTC')::date
          ) AS checked_in
         FROM members m
         WHERE (
           $1 = ''
           OR strpos(lower(m.name), lower($1)) > 0
           OR strpos(lower(m.email), lower($1)) > 0
         )
         AND (
           $2::uuid IS NULL
           OR (m.created_at, m.id) < (
             SELECT created_at, id FROM members WHERE id = $2::uuid
           )
         )
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 21`,
        [search, cursor ?? null]
      ),
      db.query(
        `SELECT
          (SELECT count(*)::int FROM members) AS members,
          (SELECT count(*)::int FROM check_ins
            WHERE day = (now() AT TIME ZONE 'UTC')::date) AS attendance,
          (SELECT count(*)::int FROM members
            WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
              AT TIME ZONE 'UTC') AS new_members`
      ),
    ]);

    const rows = members.rows.slice(0, 20);

    return NextResponse.json(
      {
        members: rows,
        stats: stats.rows[0],
        nextCursor: members.rows.length > 20 ? rows.at(-1)?.id : null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Dashboard query failed:", error);
    return NextResponse.json(
      { error: "Could not load the dashboard." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (
    !process.env.APP_ORIGIN ||
    request.headers.get("origin") !== process.env.APP_ORIGIN
  ) {
    return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }

  const input = actionSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!input.success) {
    return NextResponse.json(
      { error: "Enter valid member details." },
      { status: 400 }
    );
  }

  try {
    if (input.data.action === "create-member") {
      const { name, email, plan } = input.data;

      const result = await db.query(
        `INSERT INTO members (name, email, plan)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [name, email, plan]
      );

      return NextResponse.json(result.rows[0], { status: 201 });
    }

    const result = await db.query(
      `INSERT INTO check_ins (member_id)
       SELECT id FROM members WHERE id = $1
       ON CONFLICT (member_id, day) DO NOTHING
       RETURNING id`,
      [input.data.memberId]
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Member not found or already checked in today." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: "This email is already registered." },
        { status: 409 }
      );
    }

    console.error("Gym mutation failed:", error);
    return NextResponse.json(
      { error: "Could not save your changes." },
      { status: 500 }
    );
  }
}
