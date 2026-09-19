import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  IndianRupee,
  LogIn,
  Plus,
  RefreshCw,
  Armchair,
} from "lucide-react";
import { useMemo } from "react";
import { Badge, Button, Card, CardTitle, EmptyState, Progress } from "@/components/kit";
import { useActions } from "@/components/actions";
import {
  daysLeft,
  latestMembership,
  membershipState,
  openAttendance,
  useNow,
  useStore,
} from "@/lib/store";
import { durationLabel, formatDate, formatTime, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Vision Library Owner Console" },
      {
        name: "description",
        content:
          "Live status of Vision Library Chapra: occupancy, students inside, expiring memberships and today's collection.",
      },
      { property: "og:title", content: "Dashboard — Vision Library Owner Console" },
      {
        property: "og:description",
        content: "Live occupancy, attendance, memberships and revenue for Vision Library, Chapra.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const store = useStore();
  const actions = useActions();
  const now = useNow();
  const today = todayISO();

  const stats = useMemo(() => {
    const total = store.spaces.length;
    const occupied = store.spaces.filter((s) => s.status === "occupied").length;
    const available = store.spaces.filter((s) => s.status === "available").length;
    const reserved = store.spaces.filter((s) => s.status === "reserved").length;
    const maintenance = store.spaces.filter((s) => s.status === "maintenance").length;
    const inside = store.attendance.filter((a) => !a.checkOut);
    const todayIn = store.attendance.filter((a) => a.checkIn.startsWith(today));
    const todayOut = store.attendance.filter((a) => a.checkOut?.startsWith(today));
    const month = today.slice(0, 7);
    const monthRevenue = store.payments
      .filter((p) => p.date.startsWith(month) && p.status !== "pending")
      .reduce((sum, p) => sum + p.amount, 0);
    const todayRevenue = store.payments
      .filter((p) => p.date === today && p.status !== "pending")
      .reduce((sum, p) => sum + p.amount, 0);
    const activeMembers = store.students.filter(
      (s) => membershipState(latestMembership(store.memberships, s.id)) !== "expired",
    ).length;
    return {
      total,
      occupied,
      available,
      reserved,
      maintenance,
      inside,
      todayIn,
      todayOut,
      monthRevenue,
      todayRevenue,
      activeMembers,
      rate: total ? Math.round((occupied / total) * 100) : 0,
    };
  }, [store.spaces, store.attendance, store.payments, store.students, store.memberships, today]);

  const expiring = useMemo(
    () =>
      store.students
        .map((s) => ({ student: s, m: latestMembership(store.memberships, s.id) }))
        .filter(({ m }) => ["expiring", "expired"].includes(membershipState(m)))
        .sort((a, b) => daysLeft(a.m) - daysLeft(b.m))
        .slice(0, 6),
    [store.students, store.memberships],
  );

  const recentPayments = useMemo(
    () => [...store.payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5),
    [store.payments],
  );

  const firstFloor = store.floors[0];
  const previewSections = store.sections.filter((s) => s.floorId === firstFloor?.id);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            Good day, {store.settings.ownerName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {store.settings.libraryName} · {store.settings.address}
          </p>
        </div>
        <Button variant="primary" onClick={actions.openAddStudent}>
          <Plus className="size-4" /> Add Student
        </Button>
      </div>

      {/* KPI ROW */}
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Currently Studying</p>
          <p className="mt-2 font-display text-4xl font-semibold">{stats.inside.length}</p>
          <Badge tone="occ" className="mt-3">
            {stats.todayIn.length} check-ins today
          </Badge>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Students / Active Members</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {store.students.length}
            <span className="text-lg text-muted-foreground"> / {stats.activeMembers}</span>
          </p>
          <Badge className="mt-3">{stats.todayOut.length} check-outs today</Badge>
        </Card>
        <Card>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-medium text-muted-foreground">Occupancy</p>
            <p className="font-display text-2xl font-semibold text-avail">{stats.rate}%</p>
          </div>
          <div className="mt-4">
            <Progress value={stats.rate} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {stats.total} spaces · {stats.occupied} occupied · {stats.available} available ·{" "}
            {stats.maintenance} maintenance
          </p>
        </Card>
        <div className="rounded-3xl bg-brand p-5 text-primary-foreground shadow-[0_16px_28px_-14px_var(--brand)]">
          <p className="text-xs font-medium opacity-80">Today's Collection</p>
          <p className="mt-2 font-display text-4xl font-semibold">{inr(stats.todayRevenue)}</p>
          <span className="mt-3 inline-flex rounded-full bg-primary-foreground/20 px-2.5 py-1 text-xs font-bold">
            {inr(stats.monthRevenue)} this month
          </span>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Add Student", hint: "New member", icon: Plus, fn: actions.openAddStudent },
          {
            label: "Assign Seat",
            hint: "Pick a space",
            icon: Armchair,
            fn: () => actions.openAssign(),
          },
          { label: "Check In", hint: "Record arrival", icon: LogIn, fn: () => actions.openCheckIn() },
          {
            label: "Record Payment",
            hint: "Cash / UPI",
            icon: IndianRupee,
            fn: () => actions.openPayment(),
          },
          {
            label: "Renew Membership",
            hint: "Extend plan",
            icon: RefreshCw,
            fn: () => actions.openRenew(),
          },
        ].map(({ label, hint, icon: Icon, fn }) => (
          <button
            key={label}
            onClick={fn}
            className="clay-panel p-4 text-left transition hover:-translate-y-0.5"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft/70 text-accent-foreground">
              <Icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold">{label}</p>
            <p className="text-[11px] text-muted-foreground">{hint}</p>
          </button>
        ))}
      </section>

      {/* SEATING PREVIEW + SIDE */}
      <section className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardTitle
            title={`${firstFloor?.name ?? "Floor"} · Live Layout`}
            subtitle="Tap a space on the seating page to manage its occupant"
            right={
              <Link to="/seating" className="text-xs font-semibold text-brand">
                Manage layout →
              </Link>
            }
          />
          <div className="space-y-5">
            {previewSections.map((sec) => {
              const spaces = store.spaces.filter((sp) => sp.sectionId === sec.id).slice(0, 10);
              return (
                <div key={sec.id}>
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                    {sec.name}
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {spaces.map((sp) => {
                      const st = store.students.find((s) => s.id === sp.studentId);
                      const color =
                        sp.status === "occupied"
                          ? "bg-occ/10 border-occ/30 text-occ"
                          : sp.status === "available"
                            ? "bg-avail/10 border-avail/30 text-avail"
                            : sp.status === "reserved"
                              ? "bg-resv/10 border-resv/30 text-resv"
                              : "bg-maint/10 border-maint/30 text-maint";
                      return (
                        <Link
                          to="/seating"
                          key={sp.id}
                          className={`rounded-2xl border p-3 text-center ${color}`}
                        >
                          <p className="text-[11px] font-bold">{sp.number}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-foreground">
                            {st ? st.name.split(" ")[0] : sp.status === "available" ? "Free" : "—"}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-5 border-t border-line pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-avail" /> Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-occ" /> Occupied
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-resv" /> Reserved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-maint" /> Maintenance
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <Card>
            <CardTitle
              title="Expiring Soon"
              right={<Badge tone="resv">{expiring.length}</Badge>}
            />
            <div className="space-y-3">
              {expiring.map(({ student, m }) => {
                const left = daysLeft(m);
                return (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/students/$studentId"
                        params={{ studentId: student.id }}
                        className="block truncate text-sm font-semibold hover:text-brand"
                      >
                        {student.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {store.spaces.find((sp) => sp.studentId === student.id)?.number ?? "—"} ·{" "}
                        {store.plans.find((p) => p.id === m?.planId)?.name ?? "—"} ·{" "}
                        {m ? formatDate(m.expiryDate) : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-xs font-bold ${left < 0 ? "text-maint" : "text-resv"}`}
                      >
                        {left < 0 ? "Expired" : `${left} days`}
                      </p>
                      <button
                        onClick={() => actions.openRenew(student.id)}
                        className="text-[11px] font-semibold text-brand"
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                );
              })}
              {expiring.length === 0 && (
                <EmptyState title="All clear" message="No memberships are expiring this week." />
              )}
            </div>
          </Card>

          <Card className="flex-1">
            <CardTitle
              title="Recent Payments"
              right={
                <Link to="/payments" className="text-xs font-semibold text-brand">
                  View all →
                </Link>
              }
            />
            <div className="space-y-3">
              {recentPayments.map((p) => {
                const st = store.students.find((s) => s.id === p.studentId);
                return (
                  <div key={p.id} className="flex items-center gap-3">
                    <span
                      className={`grid size-8 place-items-center rounded-xl text-sm ${
                        p.status === "paid"
                          ? "bg-avail/12 text-avail"
                          : "bg-resv/15 text-resv"
                      }`}
                    >
                      ₹
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{st?.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.planName} · {p.method} · {formatDate(p.date)}
                      </p>
                    </div>
                    <p className="text-sm font-bold">{inr(p.amount)}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* CURRENTLY STUDYING */}
      <Card>
        <CardTitle
          title="Currently Studying"
          subtitle={`${stats.inside.length} students inside right now`}
          right={
            <Link to="/attendance" className="text-xs font-semibold text-brand">
              Attendance <ArrowRight className="inline size-3" />
            </Link>
          }
        />
        {stats.inside.length === 0 ? (
          <EmptyState title="Nobody inside" message="Check a student in to start the day." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Student</th>
                  <th className="font-semibold">Seat / Cabin</th>
                  <th className="font-semibold">Check-in</th>
                  <th className="font-semibold">Duration</th>
                  <th className="font-semibold">Membership</th>
                  <th className="text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stats.inside.map((a) => {
                  const st = store.students.find((s) => s.id === a.studentId);
                  const sp = store.spaces.find((s) => s.id === a.spaceId);
                  const m = st ? latestMembership(store.memberships, st.id) : undefined;
                  const state = membershipState(m);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5 font-semibold">{st?.name}</td>
                      <td className="text-muted-foreground">{sp?.number ?? "—"}</td>
                      <td className="text-muted-foreground">{formatTime(a.checkIn)}</td>
                      <td className="text-muted-foreground">
                        {now ? durationLabel(a.checkIn, now) : "—"}
                      </td>
                      <td>
                        <Badge
                          tone={
                            state === "active" ? "avail" : state === "expiring" ? "resv" : "maint"
                          }
                        >
                          {state === "active"
                            ? "Active"
                            : state === "expiring"
                              ? "Expiring"
                              : "Expired"}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <Button size="sm" onClick={() => actions.doCheckOut(a.studentId)}>
                          Check out
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle title="Occupancy Overview" subtitle="All floors" />
        <div className="flex h-4 overflow-hidden rounded-full">
          {[
            { w: stats.occupied, cls: "bg-occ" },
            { w: stats.available, cls: "bg-avail" },
            { w: stats.reserved, cls: "bg-resv" },
            { w: stats.maintenance, cls: "bg-maint" },
          ].map((seg, i) => (
            <div
              key={i}
              className={seg.cls}
              style={{ width: `${stats.total ? (seg.w / stats.total) * 100 : 0}%` }}
            />
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            { label: "Occupied", value: stats.occupied, cls: "bg-occ" },
            { label: "Available", value: stats.available, cls: "bg-avail" },
            { label: "Reserved", value: stats.reserved, cls: "bg-resv" },
            { label: "Maintenance", value: stats.maintenance, cls: "bg-maint" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${s.cls}`} />
              <span className="text-muted-foreground">{s.label}</span>
              <span className="ml-auto font-bold">{s.value}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" /> Occupancy rate {stats.rate}% ·{" "}
          {openAttendanceCount(store)} students inside
        </p>
      </Card>
    </>
  );
}

function openAttendanceCount(store: ReturnType<typeof useStore>) {
  return store.students.filter((s) => openAttendance(store.attendance, s.id)).length;
}
