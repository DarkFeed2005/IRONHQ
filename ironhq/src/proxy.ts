import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function matches(actual: string, expected: string) {
  const digest = (value: string) =>
    createHash("sha256").update(value).digest();

  return timingSafeEqual(digest(actual), digest(expected));
}

export function proxy(request: NextRequest) {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Admin authentication is not configured.", {
      status: 503,
    });
  }

  const authorization = request.headers.get("authorization") ?? "";

  if (authorization.startsWith("Basic ")) {
    const credentials = Buffer.from(
      authorization.slice(6),
      "base64"
    ).toString("utf8");

    if (matches(credentials, `${username}:${password}`)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="IRONHQ", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
