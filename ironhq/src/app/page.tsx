"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Check,
  Dumbbell,
  LayoutDashboard,
  Plus,
  Search,
  Users,
  X,
  Zap,
} from "lucide-react";

type Member = {
  id: string;
  name: string;
  email: string;
  plan: "Essential" | "Pro" | "Elite";
  checked_in: boolean;
};

type Dashboard = {
  members: Member[];
  stats: {
    members: number;
    attendance: number;
    new_members: number;
  };
  nextCursor: string | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ search });
        if (cursor) query.set("cursor", cursor);

        const response = await fetch(`/api/gym?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        setData(result);
        setError("");
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Request failed.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, cursor, revision]);

  useEffect(() => {
    if (!modal) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setModal(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, busy]);

  async function mutate(payload: object) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/gym", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setModal(false);
      setCursor(null);
      setRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    void mutate({
      action: "create-member",
      name: form.get("name"),
      email: form.get("email"),
      plan: form.get("plan"),
    });
  }

  const stats = [
    {
      label: "Total members",
      value: data?.stats.members,
      detail: "Your growing community",
      icon: Users,
    },
    {
      label: "Today's check-ins",
      value: data?.stats.attendance,
      detail: "Attendance recorded in UTC",
      icon: Activity,
    },
    {
      label: "New this month",
      value: data?.stats.new_members,
      detail: "New registrations this UTC month",
      icon: Zap,
    },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-icon"><Dumbbell size={23} /></span>
          IRON<span>HQ</span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <nav aria-label="Main navigation">
          <a className="nav-item selected" href="#overview">
            <LayoutDashboard size={19} /> Overview
          </a>
          <a className="nav-item" href="#members">
            <Users size={19} /> Members
          </a>
        </nav>

        <div className="sidebar-note">
          <span className="status-dot" />
          TRAIN. TRACK. TRANSFORM.
          <p>Your gym. Under control.</p>
        </div>

        <div className="profile">
          <div className="avatar">AD</div>
          <div><strong>Administrator</strong><small>Gym operations</small></div>
        </div>
      </aside>

      <main id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace / <strong>Overview</strong></div>
          <span className="workspace-badge">ADMIN WORKSPACE</span>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">BUILT FOR THE EVERYDAY GRIND</p>
            <h1>Stronger business.<br />Stronger community.</h1>
            <p className="muted">Your gym's daily operations, all in one place.</p>
          </div>

          <button className="primary" onClick={() => setModal(true)}>
            <Plus size={18} /> Add member
          </button>
        </section>

        {error && <div className="error" role="alert">{error}</div>}

        <section className="hero">
          <div className="hero-copy">
            <span className="pill"><span className="status-dot" /> IRONHQ OPERATIONS</span>
            <h2>Make every<br /><span>rep count.</span></h2>
            <p>Less admin. More impact. Build a community that keeps coming back.</p>
            <a href="#members" className="hero-link">
              Manage your members <ArrowUpRight size={20} />
            </a>
          </div>

          <div className="scene" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="weight">
              <div className="bar" />
              <div className="plate plate-left outer" />
              <div className="plate plate-left inner" />
              <div className="plate plate-right inner" />
              <div className="plate plate-right outer" />
            </div>
            <div className="floor-glow" />
            <span className="scene-caption">BUILT DIFFERENT.</span>
          </div>
        </section>

        <section className="stats" aria-label="Gym statistics">
          {stats.map(({ label, value, detail, icon: Icon }) => (
            <article className="stat-card" key={label}>
              <div className="stat-top">
                <span>{label}</span><Icon size={19} />
              </div>
              <strong>{value?.toLocaleString() ?? "--"}</strong>
              <small>{detail}</small>
            </article>
          ))}
        </section>

        <section id="members" className="members-panel">
          <div className="panel-heading">
            <div>
              <h2>Member directory</h2>
              <p className="muted">The people putting in the work.</p>
            </div>

            <label className="search">
              <Search size={17} />
              <input
                aria-label="Search members"
                placeholder="Search name or email..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCursor(null);
                }}
              />
            </label>
          </div>

          <div className="table-scroll" aria-busy={loading}>
            <table>
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>MEMBERSHIP</th>
                  <th>TODAY</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {data?.members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <div className="avatar">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <strong>{member.name}</strong>
                          <small>{member.email}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className={`plan ${member.plan.toLowerCase()}`}>{member.plan}</span></td>
                    <td>
                      <span className={member.checked_in ? "present" : "muted"}>
                        {member.checked_in ? "Checked in" : "Not checked in"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="check-button"
                        disabled={busy || member.checked_in}
                        onClick={() => void mutate({
                          action: "check-in",
                          memberId: member.id,
                        })}
                      >
                        {member.checked_in ? <Check size={15} /> : <Plus size={15} />}
                        {member.checked_in ? "Done" : "Check in"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!data?.members.length && (
                  <tr>
                    <td colSpan={4} className="empty">
                      {loading
                        ? "Loading members..."
                        : "No members found. Add a member to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="panel-footer">
            <span>{loading ? "Updating..." : `${data?.members.length ?? 0} members on this page`}</span>
            <div className="pagination">
              {cursor && <button onClick={() => setCursor(null)}>First page</button>}
              <button
                disabled={loading || !data?.nextCursor}
                onClick={() => setCursor(data?.nextCursor ?? null)}
              >
                Next page <ArrowUpRight size={14} />
              </button>
            </div>
          </footer>
        </section>

        <footer className="footer">
          IRONHQ / YOUR NEXT LEVEL STARTS HERE
        </footer>
      </main>

      {modal && (
        <dialog
          ref={(element) => {
            if (element && !element.open) element.showModal();
          }}
          className="modal"
          aria-labelledby="member-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setModal(false);
          }}
        >
          <div className="modal-heading">
            <div>
              <p className="eyebrow">GROW YOUR COMMUNITY</p>
              <h2 id="member-title">New member</h2>
            </div>
            <button
              aria-label="Close dialog"
              disabled={busy}
              onClick={() => setModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={createMember}>
            <label>
              Full name
              <input name="name" required minLength={2} maxLength={100} autoFocus />
            </label>
            <label>
              Email address
              <input name="email" type="email" required maxLength={254} />
            </label>
            <label>
              Membership plan
              <select name="plan" defaultValue="Pro">
                <option>Essential</option>
                <option>Pro</option>
                <option>Elite</option>
              </select>
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>
              {busy ? "Saving..." : "Create member"} <Plus size={17} />
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
