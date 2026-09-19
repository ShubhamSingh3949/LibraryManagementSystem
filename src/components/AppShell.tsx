import { Link, useNavigate } from "@tanstack/react-router";
import {
  Armchair,
  BarChart3,
  Bell,
  CalendarCheck,
  IndianRupee,
  LayoutGrid,
  LogOut,
  Search,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar, Badge } from "@/components/kit";
import { daysLeft, latestMembership, membershipState, useStore } from "@/lib/store";
import { formatDate, todayISO } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/seating", label: "Seating", icon: Armchair },
  { to: "/students", label: "Students", icon: Users },
  { to: "/memberships", label: "Memberships", icon: CalendarCheck },
  { to: "/attendance", label: "Attendance", icon: Wallet },
  { to: "/payments", label: "Payments", icon: IndianRupee },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const store = useStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [dateLabel, setDateLabel] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { students: [], spaces: [], payments: [] };
    return {
      students: store.students
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.phone.includes(q) ||
            s.code.toLowerCase().includes(q),
        )
        .slice(0, 5),
      spaces: store.spaces.filter((s) => s.number.toLowerCase().includes(q)).slice(0, 5),
      payments: store.payments
        .filter((p) => p.receiptId.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }, [query, store.students, store.spaces, store.payments]);

  const notifications = useMemo(() => {
    const items: { id: string; text: string; tone: "resv" | "maint" | "occ" }[] = [];
    store.students.forEach((s) => {
      const m = latestMembership(store.memberships, s.id);
      const st = membershipState(m);
      if (st === "expiring")
        items.push({
          id: `exp-${s.id}`,
          text: `${s.name}'s membership expires in ${daysLeft(m)} day(s).`,
          tone: "resv",
        });
      if (st === "expired")
        items.push({
          id: `exd-${s.id}`,
          text: `${s.name}'s membership expired on ${formatDate(m!.expiryDate)}.`,
          tone: "maint",
        });
    });
    store.payments
      .filter((p) => p.status === "pending" || p.status === "overdue")
      .slice(0, 5)
      .forEach((p) => {
        const st = store.students.find((s) => s.id === p.studentId);
        items.push({
          id: `pay-${p.id}`,
          text: `${p.status === "overdue" ? "Overdue" : "Pending"} payment · ${st?.name ?? "Student"} · receipt ${p.receiptId}.`,
          tone: "occ",
        });
      });
    store.spaces
      .filter((s) => s.status === "maintenance")
      .slice(0, 3)
      .forEach((s) =>
        items.push({ id: `mt-${s.id}`, text: `Space ${s.number} is under maintenance.`, tone: "maint" }),
      );
    return items.slice(0, 12);
  }, [store.students, store.memberships, store.payments, store.spaces]);

  const go = (to: string, params?: Record<string, string>) => {
    setShowResults(false);
    setQuery("");
    navigate({ to, params } as never);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card p-5 lg:flex">
          <Link to="/" className="mb-8 flex items-center gap-3 px-1">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand font-display text-xl font-bold text-primary-foreground shadow-[0_8px_16px_-6px_var(--brand)]">
              V
            </span>
            <span>
              <span className="block font-display text-lg leading-none font-semibold">
                Vision Library
              </span>
              <span className="mt-1 block text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                Owner Console
              </span>
            </span>
          </Link>
          <nav className="flex-1 space-y-1.5">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-background"
                activeProps={{
                  className:
                    "flex items-center gap-3 rounded-2xl bg-brand-soft/60 px-4 py-2.5 text-sm font-semibold text-brand",
                }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-3">
              <Avatar name={store.settings.ownerName} className="size-10 rounded-2xl" />
              <div className="flex-1">
                <p className="text-sm leading-tight font-semibold">{store.settings.ownerName}</p>
                <p className="text-[11px] text-muted-foreground">Owner · Chapra</p>
              </div>
              <button
                onClick={async () => {
                  await signOut();
                  toast.success("Signed out successfully");
                  navigate({ to: "/login" });
                }}
                aria-label="Log out"
                className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:bg-background"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-line bg-background/90 px-5 py-3.5 backdrop-blur-sm lg:px-8">
            <Link to="/" className="font-display text-lg font-semibold lg:hidden">
              Vision Library
            </Link>
            <p className="hidden text-sm text-muted-foreground xl:block">{dateLabel}</p>

            <div className="relative ml-auto w-full max-w-md" ref={searchRef}>
              <div className="flex items-center gap-2 rounded-2xl border border-line bg-card px-4 py-2.5 shadow-[0_4px_10px_-6px_var(--foreground)]">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowResults(true);
                  }}
                  onFocus={() => setShowResults(true)}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  placeholder="Search student, phone, seat C-12, receipt…"
                />
              </div>
              {showResults && query.trim() && (
                <div className="clay-panel absolute top-full right-0 left-0 mt-2 max-h-96 overflow-y-auto p-2">
                  {results.students.map((s) => {
                    const space = store.spaces.find((sp) => sp.studentId === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => go("/students/$studentId", { studentId: s.id })}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-background"
                      >
                        <Avatar name={s.name} className="size-8" />
                        <span className="flex-1 text-sm font-semibold">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {s.code} · {space?.number ?? "No space"}
                        </span>
                      </button>
                    );
                  })}
                  {results.spaces.map((sp) => {
                    const st = store.students.find((s) => s.id === sp.studentId);
                    return (
                      <button
                        key={sp.id}
                        onClick={() => go("/seating")}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-background"
                      >
                        <span className="font-display text-sm font-bold">{sp.number}</span>
                        <Badge tone={sp.status === "occupied" ? "occ" : "avail"}>
                          {sp.status}
                        </Badge>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {st?.name ?? "Unassigned"}
                        </span>
                      </button>
                    );
                  })}
                  {results.payments.map((p) => {
                    const st = store.students.find((s) => s.id === p.studentId);
                    return (
                      <button
                        key={p.id}
                        onClick={() => go("/payments")}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-background"
                      >
                        <span className="text-sm font-semibold">{p.receiptId}</span>
                        <span className="ml-auto text-xs text-muted-foreground">{st?.name}</span>
                      </button>
                    );
                  })}
                  {results.students.length + results.spaces.length + results.payments.length ===
                    0 && (
                    <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                      Nothing found for “{query}”.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowNotifs((v) => !v)}
                aria-label="Notifications"
                className="relative grid size-11 place-items-center rounded-2xl border border-line bg-card text-muted-foreground"
              >
                <Bell className="size-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-maint text-[10px] font-bold text-primary-foreground">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="clay-panel absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto p-3">
                  <p className="mb-2 font-display text-sm font-semibold">Alerts</p>
                  {notifications.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted-foreground">
                      Everything looks good today.
                    </p>
                  )}
                  <ul className="space-y-2">
                    {notifications.map((n) => (
                      <li key={n.id} className="flex gap-2 rounded-xl bg-background p-2.5 text-xs">
                        <span
                          className={`mt-1 size-2 shrink-0 rounded-full ${
                            n.tone === "maint"
                              ? "bg-maint"
                              : n.tone === "resv"
                                ? "bg-resv"
                                : "bg-occ"
                          }`}
                        />
                        {n.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Avatar name={store.settings.ownerName} className="size-11 rounded-2xl" />
          </header>

          <nav className="flex gap-1.5 overflow-x-auto border-b border-line bg-card px-4 py-2 lg:hidden">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground"
                activeProps={{
                  className:
                    "rounded-xl bg-brand-soft/60 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-brand",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          <main className="space-y-6 p-5 lg:p-8">{children}</main>
          <footer className="px-8 pb-8 text-xs text-muted-foreground">
            Vision Library · {store.settings.address} · Data as of {formatDate(todayISO())}
          </footer>
        </div>
      </div>
    </div>
  );
}
