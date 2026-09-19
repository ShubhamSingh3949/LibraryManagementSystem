import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/kit";
import { useStore, latestMembership } from "@/lib/store";
import { addDays, formatDate, inr, todayISO } from "@/lib/format";
import type { PaymentMethod, PaymentStatus } from "@/lib/types";

interface ActionsValue {
  openAddStudent: () => void;
  openAssign: (studentId?: string) => void;
  openCheckIn: (studentId?: string) => void;
  openPayment: (studentId?: string) => void;
  openRenew: (studentId?: string) => void;
  doCheckIn: (studentId: string) => void;
  doCheckOut: (studentId: string) => void;
}

const ActionsContext = createContext<ActionsValue | null>(null);

export function useActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useActions must be used inside ActionsProvider");
  return ctx;
}

const METHODS: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Other"];
const STATUSES: PaymentStatus[] = ["paid", "pending", "partial", "overdue"];

export function ActionsProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [assign, setAssign] = useState<{ open: boolean; studentId?: string | undefined }>({ open: false });
  const [checkin, setCheckin] = useState<{ open: boolean; studentId?: string | undefined }>({ open: false });
  const [payment, setPayment] = useState<{ open: boolean; studentId?: string | undefined }>({ open: false });
  const [renew, setRenew] = useState<{ open: boolean; studentId?: string | undefined }>({ open: false });

  const doCheckIn = (studentId: string) => {
    const err = store.checkIn(studentId);
    if (err) toast.error(err);
    else toast.success("Checked in");
  };
  const doCheckOut = (studentId: string) => {
    const err = store.checkOut(studentId);
    if (err) toast.error(err);
    else toast.success("Checked out");
  };

  const value = useMemo<ActionsValue>(
    () => ({
      openAddStudent: () => setAddOpen(true),
      openAssign: (studentId) => setAssign({ open: true, studentId }),
      openCheckIn: (studentId) => setCheckin({ open: true, studentId }),
      openPayment: (studentId) => setPayment({ open: true, studentId }),
      openRenew: (studentId) => setRenew({ open: true, studentId }),
      doCheckIn,
      doCheckOut,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store],
  );

  return (
    <ActionsContext.Provider value={value}>
      {children}
      <AddStudentFlow open={addOpen} onClose={() => setAddOpen(false)} />
      <AssignDialog
        open={assign.open}
        studentId={assign.studentId}
        onClose={() => setAssign({ open: false })}
      />
      <CheckInDialog
        open={checkin.open}
        studentId={checkin.studentId}
        onClose={() => setCheckin({ open: false })}
      />
      <PaymentDialog
        open={payment.open}
        studentId={payment.studentId}
        onClose={() => setPayment({ open: false })}
      />
      <RenewDialog
        open={renew.open}
        studentId={renew.studentId}
        onClose={() => setRenew({ open: false })}
      />
    </ActionsContext.Provider>
  );
}

/* ---------------- Add student → assign → plan → payment ---------------- */

function AddStudentFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "Chapra, Bihar",
    code: "",
    joiningDate: todayISO(),
    emergencyContact: "",
    notes: "",
  });
  const [spaceId, setSpaceId] = useState("");
  const [planId, setPlanId] = useState(store.plans[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [amount, setAmount] = useState<number>(store.plans[0]?.price ?? 0);

  const plan = store.plans.find((p) => p.id === planId);
  const freeSpaces = store.spaces.filter((s) => s.status === "available" && !s.studentId);

  useEffect(() => {
    if (store.plans.length > 0 && !store.plans.find((p) => p.id === planId)) {
      const p = store.plans[0];
      setPlanId(p.id);
      setAmount(p.price);
    }
  }, [store.plans, planId]);

  const close = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setForm({
        name: "",
        phone: "",
        email: "",
        address: "Chapra, Bihar",
        code: "",
        joiningDate: todayISO(),
        emergencyContact: "",
        notes: "",
      });
      setSpaceId("");
    }, 200);
  };

  const finish = () => {
    const code =
      form.code.trim() || `VL-${String(store.students.length + 1).padStart(4, "0")}`;
    const student = store.addStudent({ ...form, code });
    if (spaceId) {
      const err = store.assignSpace(spaceId, student.id);
      if (err) toast.error(err);
    }
    if (plan) {
      const membership = store.createMembership({
        studentId: student.id,
        planId: plan.id,
        startDate: todayISO(),
        amount,
        paymentStatus: status,
      });
      store.addPayment({
        studentId: student.id,
        membershipId: membership.id,
        planName: plan.name,
        amount,
        date: todayISO(),
        method,
        status,
      });
    }
    toast.success(`${student.name} added and activated`);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Add Student"
      subtitle={`Step ${step} of 3 — details, study space, membership & payment`}
    >
      <div className="mb-5 flex gap-2">
        {["Details", "Space", "Membership"].map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-2xl px-3 py-2 text-center text-xs font-semibold ${
              step === i + 1
                ? "bg-brand-soft/70 text-accent-foreground"
                : "bg-background text-muted-foreground"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Rahul Sharma"
            />
          </Field>
          <Field label="Phone Number">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="98350 42117"
            />
          </Field>
          <Field label="Email">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Student ID" hint="Leave blank to auto-generate">
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="VL-0025"
            />
          </Field>
          <Field label="Joining Date">
            <Input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </Field>
          <Field label="Emergency Contact">
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
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Field label="Assign Study Space" hint="Only available spaces are listed">
            <Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              <option value="">Assign later</option>
              {freeSpaces.map((s) => {
                const floor = store.floors.find((f) => f.id === s.floorId);
                const type = store.spaceTypes.find((t) => t.id === s.typeId);
                return (
                  <option key={s.id} value={s.id}>
                    {s.number} · {type?.name} · {floor?.name} · {inr(s.price)}/mo
                  </option>
                );
              })}
            </Select>
          </Field>
          {freeSpaces.length === 0 && (
            <p className="text-xs text-maint">No available spaces right now.</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Membership Plan">
            <Select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const p = store.plans.find((x) => x.id === e.target.value);
                if (p) setAmount(p.price);
              }}
            >
              {store.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.days} days · {inr(p.price)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Amount (₹)">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Payment Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Payment Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
          <div className="rounded-2xl bg-background p-4 text-sm sm:col-span-2">
            Membership runs {formatDate(todayISO())} →{" "}
            <strong>{formatDate(addDays(todayISO(), plan?.days ?? 30))}</strong>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-between gap-2">
        <Button onClick={close}>Cancel</Button>
        <div className="flex gap-2">
          {step > 1 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 3 ? (
            <Button
              variant="primary"
              disabled={step === 1 && (!form.name.trim() || !form.phone.trim())}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button variant="primary" onClick={finish}>
              Activate Membership
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- Student picker ---------------- */

function StudentPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const store = useStore();
  const [q, setQ] = useState("");
  const list = store.students
    .filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.phone.includes(q) ||
        s.code.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 50);
  return (
    <div className="space-y-3">
      <Field label="Search Student" hint="Name, phone or student ID">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rahul / 98350 / VL-0001" />
      </Field>
      <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-2xl border border-line p-2">
        {list.map((s) => {
          const space = store.spaces.find((sp) => sp.studentId === s.id);
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                value === s.id ? "bg-brand-soft/70" : "hover:bg-background"
              }`}
            >
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.code}</span>
              <span className="text-xs text-muted-foreground">{space?.number ?? "No space"}</span>
            </button>
          );
        })}
        {list.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No students match that search.
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- Assign space ---------------- */

function AssignDialog({
  open,
  studentId,
  onClose,
}: {
  open: boolean;
  studentId?: string | undefined;
  onClose: () => void;
}) {
  const store = useStore();
  const [picked, setPicked] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const sid = studentId ?? picked;
  const student = store.students.find((s) => s.id === sid);
  const freeSpaces = store.spaces.filter((s) => s.status === "available" && !s.studentId);

  const submit = () => {
    if (!sid || !spaceId) return;
    const err = store.assignSpace(spaceId, sid);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(`Space assigned to ${student?.name}`);
    setSpaceId("");
    setPicked("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign Study Space">
      <div className="space-y-4">
        {!studentId && <StudentPicker value={picked} onChange={setPicked} />}
        {student && (
          <p className="rounded-2xl bg-background p-3 text-sm">
            Assigning for <strong>{student.name}</strong> ({student.code})
          </p>
        )}
        <Field label="Available Space">
          <Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
            <option value="">Select a space</option>
            {freeSpaces.map((s) => {
              const floor = store.floors.find((f) => f.id === s.floorId);
              const sec = store.sections.find((x) => x.id === s.sectionId);
              return (
                <option key={s.id} value={s.id}>
                  {s.number} · {sec?.name} · {floor?.name} · {inr(s.price)}/mo
                </option>
              );
            })}
          </Select>
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!sid || !spaceId} onClick={submit}>
          Assign Space
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Check in ---------------- */

function CheckInDialog({
  open,
  studentId,
  onClose,
}: {
  open: boolean;
  studentId?: string | undefined;
  onClose: () => void;
}) {
  const store = useStore();
  const { doCheckIn } = useActions();
  const [picked, setPicked] = useState("");
  const sid = studentId ?? picked;
  const student = store.students.find((s) => s.id === sid);
  const space = store.spaces.find((sp) => sp.studentId === sid);

  return (
    <Modal open={open} onClose={onClose} title="Check In Student">
      <div className="space-y-4">
        {!studentId && <StudentPicker value={picked} onChange={setPicked} />}
        {student && (
          <div className="rounded-2xl bg-background p-4 text-sm">
            <p className="font-semibold">{student.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {student.code} · Assigned space: {space?.number ?? "none"}
            </p>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={!sid}
          onClick={() => {
            doCheckIn(sid);
            setPicked("");
            onClose();
          }}
        >
          Check In
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Record payment ---------------- */

function PaymentDialog({
  open,
  studentId,
  onClose,
}: {
  open: boolean;
  studentId?: string | undefined;
  onClose: () => void;
}) {
  const store = useStore();
  const [picked, setPicked] = useState("");
  const sid = studentId ?? picked;
  const [amount, setAmount] = useState(1200);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const membership = sid ? latestMembership(store.memberships, sid) : undefined;
  const plan = store.plans.find((p) => p.id === membership?.planId);

  const submit = () => {
    if (!sid) {
      return;
    }
    store.addPayment({
      studentId: sid,
      membershipId: membership?.id ?? null,
      planName: plan?.name ?? "Custom",
      amount,
      date,
      method,
      status,
    });
    toast.success(`Payment of ${inr(amount)} recorded`);
    setPicked("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <div className="space-y-4">
        {!studentId && <StudentPicker value={picked} onChange={setPicked} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!sid} onClick={submit}>
          Save Payment
        </Button>
      </div>
    </Modal>
  );
}

/* ---------------- Renew membership ---------------- */

function RenewDialog({
  open,
  studentId,
  onClose,
}: {
  open: boolean;
  studentId?: string | undefined;
  onClose: () => void;
}) {
  const store = useStore();
  const [picked, setPicked] = useState("");
  const sid = studentId ?? picked;
  const current = sid ? latestMembership(store.memberships, sid) : undefined;
  const [planId, setPlanId] = useState(store.plans[0]?.id ?? "");
  const [start, setStart] = useState(todayISO());
  const [amount, setAmount] = useState(store.plans[0]?.price ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const plan = store.plans.find((p) => p.id === planId);
  const student = store.students.find((s) => s.id === sid);

  useEffect(() => {
    if (store.plans.length > 0 && !store.plans.find((p) => p.id === planId)) {
      const p = store.plans[0];
      setPlanId(p.id);
      setAmount(p.price);
    }
  }, [store.plans, planId]);

  const submit = () => {
    if (!sid || !plan) return;
    const membership = store.createMembership({
      studentId: sid,
      planId: plan.id,
      startDate: start,
      amount,
      paymentStatus: status,
    });
    store.addPayment({
      studentId: sid,
      membershipId: membership.id,
      planName: plan.name,
      amount,
      date: start,
      method,
      status,
    });
    toast.success(`Membership renewed till ${formatDate(membership.expiryDate)}`);
    setPicked("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Renew Membership" wide>
      <div className="space-y-4">
        {!studentId && <StudentPicker value={picked} onChange={setPicked} />}
        {student && (
          <p className="rounded-2xl bg-background p-3 text-sm">
            <strong>{student.name}</strong> · current plan expires{" "}
            {current ? formatDate(current.expiryDate) : "—"}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Plan">
            <Select
              value={planId}
              onChange={(e) => {
                setPlanId(e.target.value);
                const p = store.plans.find((x) => x.id === e.target.value);
                if (p) setAmount(p.price);
              }}
            >
              {store.plans
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.days} days · {inr(p.price)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Start Date">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Amount (₹)">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </Field>
          <Field label="Payment Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </Field>
          <Field label="Payment Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <div className="w-full rounded-2xl bg-background p-3 text-sm">
              New expiry:{" "}
              <strong>{formatDate(addDays(start, plan?.days ?? 30))}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!sid || !plan} onClick={submit}>
          Confirm Renewal
        </Button>
      </div>
    </Modal>
  );
}
