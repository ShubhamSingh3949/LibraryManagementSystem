import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Textarea,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import {
  daysLeft,
  latestMembership,
  membershipState,
  openAttendance,
  useNow,
  useStore,
} from "@/lib/store";
import { durationLabel, formatDate, formatTime, inr } from "@/lib/format";

export const Route = createFileRoute("/students/$studentId")({
  head: () => ({
    meta: [
      { title: "Student Profile — Vision Library" },
      {
        name: "description",
        content:
          "Full student profile at Vision Library Chapra: study space, membership, attendance history and payments.",
      },
      { property: "og:title", content: "Student Profile — Vision Library" },
      {
        property: "og:description",
        content: "Study space, membership, attendance and payment history for a Vision Library student.",
      },
    ],
  }),
  component: StudentProfile,
});

function StudentProfile() {
  const { studentId } = Route.useParams();
  const store = useStore();
  const actions = useActions();
  const navigate = useNavigate();
  const now = useNow();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const student = store.students.find((s) => s.id === studentId);
  const membership = student ? latestMembership(store.memberships, student.id) : undefined;
  const space = store.spaces.find((sp) => sp.studentId === studentId);
  const inside = openAttendance(store.attendance, studentId);

  const visits = useMemo(
    () =>
      store.attendance
        .filter((a) => a.studentId === studentId)
        .sort((a, b) => (a.checkIn < b.checkIn ? 1 : -1)),
    [store.attendance, studentId],
  );
  const payments = useMemo(
    () =>
      store.payments
        .filter((p) => p.studentId === studentId)
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [store.payments, studentId],
  );

  if (!student) {
    return (
      <EmptyState title="Student not found" message="This student may have been deleted." />
    );
  }

  const state = membershipState(membership);

  return (
    <>
      <Link to="/students" className="flex items-center gap-1.5 text-xs font-semibold text-brand">
        <ArrowLeft className="size-3.5" /> All students
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} className="size-14 text-base" />
            <div>
              <h1 className="font-display text-2xl font-semibold">{student.name}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {student.code} · {student.phone} · Joined {formatDate(student.joiningDate)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone={state === "active" ? "avail" : state === "expiring" ? "resv" : "maint"}>
                  {state === "active" ? "Active" : state === "expiring" ? "Expiring soon" : "Expired"}
                </Badge>
                {inside && <Badge tone="occ">Currently studying</Badge>}
                {space && <Badge>{space.number}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => actions.openRenew(student.id)}>
              Renew
            </Button>
            <Button onClick={() => actions.openAssign(student.id)}>
              {space ? "Change Seat" : "Assign Seat"}
            </Button>
            {inside ? (
              <Button onClick={() => actions.doCheckOut(student.id)}>Check Out</Button>
            ) : (
              <Button onClick={() => actions.doCheckIn(student.id)}>Check In</Button>
            )}
            <Button onClick={() => actions.openPayment(student.id)}>Record Payment</Button>
            <Button onClick={() => setEditOpen(true)}>Edit</Button>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardTitle title="Contact" />
          <dl className="space-y-2.5 text-sm">
            <Row label="Email" value={student.email || "—"} />
            <Row label="Address" value={student.address || "—"} />
            <Row label="Emergency" value={student.emergencyContact || "—"} />
            <Row label="Notes" value={student.notes || "—"} />
          </dl>
        </Card>

        <Card>
          <CardTitle title="Membership" />
          {membership ? (
            <dl className="space-y-2.5 text-sm">
              <Row
                label="Plan"
                value={store.plans.find((p) => p.id === membership.planId)?.name ?? "—"}
              />
              <Row label="Start" value={formatDate(membership.startDate)} />
              <Row label="Expiry" value={formatDate(membership.expiryDate)} />
              <Row
                label="Days left"
                value={daysLeft(membership) < 0 ? "Expired" : `${daysLeft(membership)} days`}
              />
              <Row label="Amount" value={inr(membership.amount)} />
              <Row label="Payment" value={membership.paymentStatus.toUpperCase()} />
            </dl>
          ) : (
            <EmptyState title="No membership" message="Renew to start a plan for this student." />
          )}
        </Card>

        <Card>
          <CardTitle title="Study Space" />
          {space ? (
            <dl className="space-y-2.5 text-sm">
              <Row label="Number" value={space.number} />
              <Row
                label="Type"
                value={store.spaceTypes.find((t) => t.id === space.typeId)?.name ?? "—"}
              />
              <Row label="Floor" value={store.floors.find((f) => f.id === space.floorId)?.name ?? "—"} />
              <Row
                label="Section"
                value={store.sections.find((s) => s.id === space.sectionId)?.name ?? "—"}
              />
              <Row label="Monthly price" value={inr(space.price)} />
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    store.releaseSpace(space.id);
                    toast.success(`${space.number} released`);
                  }}
                >
                  Release space
                </Button>
              </div>
            </dl>
          ) : (
            <EmptyState title="No space assigned" message="Assign a seat or cabin to this student." />
          )}
        </Card>
      </section>

      <Card>
        <CardTitle
          title="Attendance"
          subtitle={`${visits.length} total visits · last visit ${
            visits[0] ? formatDate(visits[0].checkIn.slice(0, 10)) : "—"
          }`}
        />
        {visits.length === 0 ? (
          <EmptyState title="No visits yet" message="Check the student in to start tracking." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Date</th>
                  <th className="font-semibold">Check-in</th>
                  <th className="font-semibold">Check-out</th>
                  <th className="font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visits.slice(0, 10).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5">{formatDate(a.checkIn.slice(0, 10))}</td>
                    <td className="text-muted-foreground">{formatTime(a.checkIn)}</td>
                    <td className="text-muted-foreground">
                      {a.checkOut ? formatTime(a.checkOut) : "Currently studying"}
                    </td>
                    <td className="text-muted-foreground">
                      {a.checkOut
                        ? durationLabel(a.checkIn, a.checkOut)
                        : now
                          ? durationLabel(a.checkIn, now)
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle title="Payment History" subtitle={`${payments.length} records`} />
        {payments.length === 0 ? (
          <EmptyState title="No payments" message="Record a payment for this student." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Receipt</th>
                  <th className="font-semibold">Date</th>
                  <th className="font-semibold">Plan</th>
                  <th className="font-semibold">Method</th>
                  <th className="font-semibold">Status</th>
                  <th className="text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 font-medium">{p.receiptId}</td>
                    <td className="text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="text-muted-foreground">{p.planName}</td>
                    <td className="text-muted-foreground">{p.method}</td>
                    <td>
                      <Badge tone={p.status === "paid" ? "avail" : p.status === "overdue" ? "maint" : "resv"}>
                        {p.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="text-right font-bold">{inr(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        studentId={student.id}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete student?"
        message="This removes the student, frees their space and keeps no membership record."
        confirmLabel="Delete student"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          store.deleteStudent(student.id);
          setConfirmDelete(false);
          toast.success("Student deleted");
          navigate({ to: "/students" });
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function EditStudentModal({
  open,
  onClose,
  studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
}) {
  const store = useStore();
  const student = store.students.find((s) => s.id === studentId);
  const [form, setForm] = useState(() => ({ ...student! }));

  if (!student) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit student"
      subtitle={student.code}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              store.updateStudent(studentId, {
                name: form.name,
                phone: form.phone,
                email: form.email,
                address: form.address,
                emergencyContact: form.emergencyContact,
                notes: form.notes,
              });
              toast.success("Student updated");
              onClose();
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Emergency contact">
          <Input
            value={form.emergencyContact}
            onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
