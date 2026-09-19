import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import { latestMembership, membershipState, openAttendance, useStore } from "@/lib/store";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/students/")({
  head: () => ({
    meta: [
      { title: "Students — Vision Library Owner Console" },
      {
        name: "description",
        content:
          "Search and manage every student at Vision Library, Chapra with seat, membership and payment status.",
      },
      { property: "og:title", content: "Students — Vision Library" },
      {
        property: "og:description",
        content: "Student directory with seats, memberships and payment status.",
      },
    ],
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const store = useStore();
  const actions = useActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.students
      .map((student) => {
        const membership = latestMembership(store.memberships, student.id);
        const space = store.spaces.find((sp) => sp.studentId === student.id);
        return { student, membership, space, state: membershipState(membership) };
      })
      .filter(({ student, space, state }) => {
        const matchQ =
          !q ||
          student.name.toLowerCase().includes(q) ||
          student.phone.includes(q) ||
          student.code.toLowerCase().includes(q) ||
          (space?.number.toLowerCase().includes(q) ?? false);
        const matchF =
          filter === "all" ||
          (filter === "active" && student.active && state === "active") ||
          (filter === "inactive" && !student.active) ||
          (filter === "expired" && state === "expired") ||
          (filter === "expiring" && state === "expiring");
        return matchQ && matchF;
      });
  }, [store.students, store.memberships, store.spaces, query, filter]);

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${store.students.length} registered · ${rows.length} shown`}
        actions={
          <Button variant="primary" onClick={actions.openAddStudent}>
            <Plus className="size-4" /> Add Student
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Search">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, phone, student ID or seat number"
              />
            </Field>
          </div>
          <Field label="Filter">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All students</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No students found" message="Adjust the search or add a new student." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Student</th>
                  <th className="font-semibold">Phone</th>
                  <th className="font-semibold">Space</th>
                  <th className="font-semibold">Membership</th>
                  <th className="font-semibold">Start</th>
                  <th className="font-semibold">Expiry</th>
                  <th className="font-semibold">Payment</th>
                  <th className="font-semibold">Status</th>
                  <th className="text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ student, membership, space, state }) => (
                  <tr key={student.id}>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={student.name} className="size-8" />
                        <div>
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: student.id }}
                            className="font-semibold hover:text-brand"
                          >
                            {student.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">{student.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{student.phone}</td>
                    <td className="text-muted-foreground">{space?.number ?? "—"}</td>
                    <td className="text-muted-foreground">
                      {store.plans.find((p) => p.id === membership?.planId)?.name ?? "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {membership ? formatDate(membership.startDate) : "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {membership ? formatDate(membership.expiryDate) : "—"}
                    </td>
                    <td>
                      <Badge
                        tone={membership?.paymentStatus === "paid" ? "avail" : "resv"}
                      >
                        {(membership?.paymentStatus ?? "—").toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <Badge
                        tone={state === "active" ? "avail" : state === "expiring" ? "resv" : "maint"}
                      >
                        {state === "active"
                          ? "Active"
                          : state === "expiring"
                            ? "Expiring"
                            : "Expired"}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {openAttendance(store.attendance, student.id) ? (
                          <Button size="sm" onClick={() => actions.doCheckOut(student.id)}>
                            Check out
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => actions.doCheckIn(student.id)}>
                            Check in
                          </Button>
                        )}
                        <Button size="sm" onClick={() => actions.openRenew(student.id)}>
                          Renew
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
