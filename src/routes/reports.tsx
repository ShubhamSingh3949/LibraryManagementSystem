import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
import { Button, Card, CardTitle, Field, Input, PageHeader, Progress } from "@/components/kit";
import { latestMembership, membershipState, useStore } from "@/lib/store";
import { formatDate, inr, todayISO } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Vision Library" },
      {
        name: "description",
        content:
          "Occupancy, revenue, membership and attendance reports for Vision Library, Chapra with CSV export and print.",
      },
      { property: "og:title", content: "Reports — Vision Library" },
      {
        property: "og:description",
        content: "Occupancy, revenue, membership and attendance analytics with CSV export.",
      },
    ],
  }),
  component: ReportsPage,
});

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const store = useStore();
  const today = todayISO();
  const [from, setFrom] = useState(
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(today);

  const inRange = (d: string) => d >= from && d <= to;

  const occupancy = useMemo(() => {
    const total = store.spaces.length;
    const by = (st: string) => store.spaces.filter((s) => s.status === st).length;
    return {
      total,
      occupied: by("occupied"),
      available: by("available"),
      reserved: by("reserved"),
      maintenance: by("maintenance"),
      rate: total ? Math.round((by("occupied") / total) * 100) : 0,
      byFloor: store.floors.map((f) => {
        const spaces = store.spaces.filter((s) => s.floorId === f.id);
        const occ = spaces.filter((s) => s.status === "occupied").length;
        return {
          name: f.name,
          total: spaces.length,
          occupied: occ,
          available: spaces.filter((s) => s.status === "available").length,
          rate: spaces.length ? Math.round((occ / spaces.length) * 100) : 0,
        };
      }),
    };
  }, [store.spaces, store.floors]);

  const revenue = useMemo(() => {
    const payments = store.payments.filter((p) => inRange(p.date) && p.status !== "pending");
    const byDay = new Map<string, number>();
    payments.forEach((p) => byDay.set(p.date, (byDay.get(p.date) ?? 0) + p.amount));
    const series = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, amount]) => ({ date: date.slice(5), amount }));
    const byMethod = ["Cash", "UPI", "Bank Transfer", "Other"].map((m) => ({
      name: m,
      value: payments.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0),
    }));
    return {
      total: payments.reduce((s, p) => s + p.amount, 0),
      count: payments.length,
      series,
      byMethod: byMethod.filter((m) => m.value > 0),
    };
  }, [store.payments, from, to]);

  const membership = useMemo(() => {
    const rows = store.students.map((s) => ({
      student: s,
      m: latestMembership(store.memberships, s.id),
    }));
    return {
      active: rows.filter((r) => membershipState(r.m) === "active").length,
      expiring: rows.filter((r) => membershipState(r.m) === "expiring").length,
      expired: rows.filter((r) => membershipState(r.m) === "expired").length,
      newJoiners: store.students.filter((s) => inRange(s.joiningDate)).length,
      renewals: store.memberships.filter((m) => inRange(m.startDate)).length,
    };
  }, [store.students, store.memberships, from, to]);

  const attendance = useMemo(() => {
    const records = store.attendance.filter((a) => inRange(a.checkIn.slice(0, 10)));
    const hours = new Array(24).fill(0) as number[];
    records.forEach((a) => {
      const h = new Date(a.checkIn).getHours();
      hours[h] = (hours[h] ?? 0) + 1;
    });
    const durations = records.filter((a) => a.checkOut);
    const avg = durations.length
      ? Math.round(
          durations.reduce(
            (s, a) => s + (new Date(a.checkOut!).getTime() - new Date(a.checkIn).getTime()) / 60000,
            0,
          ) / durations.length,
        )
      : 0;
    const counts = new Map<string, number>();
    records.forEach((a) => counts.set(a.studentId, (counts.get(a.studentId) ?? 0) + 1));
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, n]) => ({ name: store.students.find((s) => s.id === id)?.name ?? "—", visits: n }));
    return {
      visits: records.length,
      avg,
      peak: hours.map((n, h) => ({ hour: `${h}:00`, visits: n })).filter((x) => x.visits > 0),
      top,
    };
  }, [store.attendance, store.students, from, to]);

  const pieColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`${formatDate(from)} → ${formatDate(to)}`}
        actions={
          <>
            <Button onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                downloadCsv("vision-library-report", [
                  ["Report", "Vision Library", `${from} to ${to}`],
                  [],
                  ["Occupancy"],
                  ["Floor", "Total", "Occupied", "Available", "Rate %"],
                  ...occupancy.byFloor.map((f) => [f.name, f.total, f.occupied, f.available, f.rate]),
                  [],
                  ["Revenue"],
                  ["Date", "Amount"],
                  ...revenue.series.map((r) => [r.date, r.amount]),
                  [],
                  ["Memberships"],
                  ["Active", membership.active],
                  ["Expiring", membership.expiring],
                  ["Expired", membership.expired],
                  ["New joiners", membership.newJoiners],
                  ["Renewals", membership.renewals],
                  [],
                  ["Attendance"],
                  ["Visits", attendance.visits],
                  ["Average minutes", attendance.avg],
                ])
              }
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardTitle
            title="Occupancy Report"
            subtitle={`${occupancy.occupied} of ${occupancy.total} spaces occupied · ${occupancy.rate}%`}
          />
          <div className="space-y-4">
            {occupancy.byFloor.map((f) => (
              <div key={f.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="font-semibold">{f.name}</span>
                  <span className="text-muted-foreground">
                    {f.occupied}/{f.total} · {f.rate}%
                  </span>
                </div>
                <Progress value={f.rate} tone="occ" />
              </div>
            ))}
          </div>
          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancy.byFloor}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="occupied" fill="var(--occ)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="available" fill="var(--avail)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Revenue Report"
            subtitle={`${inr(revenue.total)} collected from ${revenue.count} payments`}
          />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip formatter={(v) => inr(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenue.byMethod}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  outerRadius={66}
                  paddingAngle={3}
                >
                  {revenue.byMethod.map((_, i) => (
                    <Cell key={i} fill={pieColors[i % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => inr(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            {revenue.byMethod.map((m, i) => (
              <span key={m.name} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: pieColors[i % pieColors.length] }}
                />
                {m.name} · {inr(m.value)}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle title="Membership Report" subtitle="Status across all students" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              { label: "Active", value: membership.active },
              { label: "Expiring", value: membership.expiring },
              { label: "Expired", value: membership.expired },
              { label: "New joiners", value: membership.newJoiners },
              { label: "Renewals", value: membership.renewals },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-background p-3 text-center">
                <p className="font-display text-2xl font-semibold">{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Attendance Report"
            subtitle={`${attendance.visits} visits · avg ${Math.floor(attendance.avg / 60)}h ${attendance.avg % 60}m`}
          />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendance.peak}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="hour" fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip />
                <Bar dataKey="visits" fill="var(--brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 mb-2 text-xs font-semibold text-muted-foreground">Most active students</p>
          <div className="space-y-2">
            {attendance.top.map((t) => (
              <div key={t.name} className="flex justify-between text-sm">
                <span>{t.name}</span>
                <span className="font-semibold">{t.visits} visits</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}
