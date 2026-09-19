import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import { openAttendance, useNow, useStore } from "@/lib/store";
import { durationLabel, formatDate, formatTime, todayISO } from "@/lib/format";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — Vision Library" },
      {
        name: "description",
        content:
          "Check students in and out at Vision Library, Chapra and track who is studying, visit counts and durations.",
      },
      { property: "og:title", content: "Attendance — Vision Library" },
      {
        property: "og:description",
        content: "Live check-in and check-out log with study durations.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const store = useStore();
  const actions = useActions();
  const now = useNow();
  const [date, setDate] = useState(todayISO());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const inside = store.attendance.filter((a) => !a.checkOut);

  const dayRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.attendance
      .filter((a) => a.checkIn.startsWith(date))
      .filter((a) => {
        if (filter === "inside") return !a.checkOut;
        if (filter === "done") return !!a.checkOut;
        return true;
      })
      .filter((a) => {
        if (!q) return true;
        const st = store.students.find((s) => s.id === a.studentId);
        const sp = store.spaces.find((s) => s.id === a.spaceId);
        return (
          (st?.name.toLowerCase().includes(q) ?? false) ||
          (st?.phone.includes(q) ?? false) ||
          (st?.code.toLowerCase().includes(q) ?? false) ||
          (sp?.number.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1));
  }, [store.attendance, store.students, store.spaces, date, query, filter]);

  const completedToday = store.attendance.filter(
    (a) => a.checkOut && a.checkIn.startsWith(date),
  );
  const avgMinutes = completedToday.length
    ? Math.round(
        completedToday.reduce(
          (sum, a) =>
            sum + (new Date(a.checkOut!).getTime() - new Date(a.checkIn).getTime()) / 60000,
          0,
        ) / completedToday.length,
      )
    : 0;

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Fast check-in and check-out for every study session"
        actions={
          <>
            <Button onClick={() => actions.openCheckIn()}>Check in</Button>
            <Button variant="primary" onClick={() => actions.openCheckIn()}>
              New session
            </Button>
          </>
        }
      />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Currently Inside</p>
          <p className="mt-2 font-display text-4xl font-semibold text-occ">{inside.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Visits on {formatDate(date)}</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {store.attendance.filter((a) => a.checkIn.startsWith(date)).length}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Check-outs</p>
          <p className="mt-2 font-display text-4xl font-semibold">{completedToday.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted-foreground">Average duration</p>
          <p className="mt-2 font-display text-4xl font-semibold">
            {Math.floor(avgMinutes / 60)}h {avgMinutes % 60}m
          </p>
        </Card>
      </section>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Search">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone, student ID or seat"
            />
          </Field>
          <Field label="Show">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All sessions</option>
              <option value="inside">Currently studying</option>
              <option value="done">Checked out</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle title="Sessions" subtitle={`${dayRecords.length} records`} />
        {dayRecords.length === 0 ? (
          <EmptyState title="No sessions" message="No check-ins recorded for this date yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Student</th>
                  <th className="font-semibold">Seat / Cabin</th>
                  <th className="font-semibold">Check-in</th>
                  <th className="font-semibold">Check-out</th>
                  <th className="font-semibold">Duration</th>
                  <th className="font-semibold">Status</th>
                  <th className="text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dayRecords.map((a) => {
                  const st = store.students.find((s) => s.id === a.studentId);
                  const sp = store.spaces.find((s) => s.id === a.spaceId);
                  return (
                    <tr key={a.id}>
                      <td className="py-2.5">
                        {st ? (
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: st.id }}
                            className="font-semibold hover:text-brand"
                          >
                            {st.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-muted-foreground">{sp?.number ?? "—"}</td>
                      <td className="text-muted-foreground">{formatTime(a.checkIn)}</td>
                      <td className="text-muted-foreground">
                        {a.checkOut ? formatTime(a.checkOut) : "—"}
                      </td>
                      <td className="text-muted-foreground">
                        {a.checkOut
                          ? durationLabel(a.checkIn, a.checkOut)
                          : now
                            ? durationLabel(a.checkIn, now)
                            : "—"}
                      </td>
                      <td>
                        <Badge tone={a.checkOut ? "neutral" : "occ"}>
                          {a.checkOut ? "Completed" : "Currently Studying"}
                        </Badge>
                      </td>
                      <td className="text-right">
                        {a.checkOut ? (
                          <span className="text-xs text-muted-foreground">Done</span>
                        ) : (
                          <Button size="sm" onClick={() => actions.doCheckOut(a.studentId)}>
                            Check out
                          </Button>
                        )}
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
        <CardTitle title="Quick check-in" subtitle="Students not currently inside" />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {store.students
            .filter((s) => !openAttendance(store.attendance, s.id))
            .slice(0, 9)
            .map((s) => {
              const sp = store.spaces.find((x) => x.studentId === s.id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.code} · {sp?.number ?? "No seat"}
                    </p>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => actions.doCheckIn(s.id)}>
                    Check in
                  </Button>
                </div>
              );
            })}
        </div>
      </Card>
    </>
  );
}
