import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import { latestMembership, useStore } from "@/lib/store";
import { formatDate, inr, todayISO } from "@/lib/format";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/types";

export const Route = createFileRoute("/payments")({
  head: () => ({
    meta: [
      { title: "Payments & Receipts — Vision Library" },
      {
        name: "description",
        content:
          "Record cash, UPI and bank payments at Vision Library Chapra and print professional receipts in ₹.",
      },
      { property: "og:title", content: "Payments & Receipts — Vision Library" },
      {
        property: "og:description",
        content: "Collections, pending dues and printable receipts for Vision Library.",
      },
    ],
  }),
  component: PaymentsPage,
});

const METHODS: PaymentMethod[] = ["Cash", "UPI", "Bank Transfer", "Other"];
const STATUSES: PaymentStatus[] = ["paid", "pending", "overdue", "partial"];

function PaymentsPage() {
  const store = useStore();
  const actions = useActions();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);

  const today = todayISO();
  const month = today.slice(0, 7);
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const paid = store.payments.filter((p) => p.status === "paid" || p.status === "partial");
    return {
      today: paid.filter((p) => p.date === today).reduce((s, p) => s + p.amount, 0),
      week: paid.filter((p) => p.date >= weekStart).reduce((s, p) => s + p.amount, 0),
      month: paid.filter((p) => p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0),
      pending: store.payments
        .filter((p) => p.status === "pending")
        .reduce((s, p) => s + p.amount, 0),
      overdue: store.payments
        .filter((p) => p.status === "overdue")
        .reduce((s, p) => s + p.amount, 0),
    };
  }, [store.payments, today, weekStart, month]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.payments
      .filter((p) => (method === "all" || p.method === method) && (status === "all" || p.status === status))
      .filter((p) => {
        if (!q) return true;
        const st = store.students.find((s) => s.id === p.studentId);
        return (
          p.receiptId.toLowerCase().includes(q) ||
          (st?.name.toLowerCase().includes(q) ?? false) ||
          (st?.phone.includes(q) ?? false)
        );
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [store.payments, store.students, query, method, status]);

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Cash, UPI and bank collections in ₹"
        actions={
          <Button variant="primary" onClick={() => actions.openPayment()}>
            Record payment
          </Button>
        }
      />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Today's Collection", value: stats.today, tone: "brand" },
          { label: "This Week", value: stats.week },
          { label: "This Month", value: stats.month },
          { label: "Pending", value: stats.pending, tone: "resv" },
          { label: "Overdue", value: stats.overdue, tone: "maint" },
        ].map((s) =>
          s.tone === "brand" ? (
            <div
              key={s.label}
              className="rounded-3xl bg-brand p-5 text-primary-foreground shadow-[0_16px_28px_-14px_var(--brand)]"
            >
              <p className="text-xs opacity-80">{s.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold">{inr(s.value)}</p>
            </div>
          ) : (
            <Card key={s.label}>
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <p
                className={`mt-2 font-display text-3xl font-semibold ${
                  s.tone === "maint" ? "text-maint" : s.tone === "resv" ? "text-resv" : ""
                }`}
              >
                {inr(s.value)}
              </p>
            </Card>
          ),
        )}
      </section>

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Search">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Receipt number, student name or phone"
            />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="all">All methods</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle title="Payment records" subtitle={`${rows.length} transactions`} />
        {rows.length === 0 ? (
          <EmptyState title="No payments" message="Record your first payment for this filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 font-semibold">Receipt ID</th>
                  <th className="font-semibold">Student</th>
                  <th className="font-semibold">Membership</th>
                  <th className="font-semibold">Date</th>
                  <th className="font-semibold">Method</th>
                  <th className="font-semibold">Status</th>
                  <th className="font-semibold">Amount</th>
                  <th className="text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => {
                  const st = store.students.find((s) => s.id === p.studentId);
                  return (
                    <tr key={p.id}>
                      <td className="py-2.5 font-medium">{p.receiptId}</td>
                      <td>
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
                      <td className="text-muted-foreground">{p.planName}</td>
                      <td className="text-muted-foreground">{formatDate(p.date)}</td>
                      <td className="text-muted-foreground">{p.method}</td>
                      <td>
                        <Badge
                          tone={
                            p.status === "paid"
                              ? "avail"
                              : p.status === "overdue"
                                ? "maint"
                                : "resv"
                          }
                        >
                          {p.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="font-bold">{inr(p.amount)}</td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" onClick={() => setReceipt(p)}>
                            Receipt
                          </Button>
                          <Button size="sm" onClick={() => setEditing(p)}>
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EditPaymentModal payment={editing} onClose={() => setEditing(null)} />
      <ReceiptModal payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}

function EditPaymentModal({
  payment,
  onClose,
}: {
  payment: Payment | null;
  onClose: () => void;
}) {
  const store = useStore();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [key, setKey] = useState<string | null>(null);

  if (payment && payment.id !== key) {
    setKey(payment.id);
    setAmount(payment.amount);
    setDate(payment.date);
    setMethod(payment.method);
    setStatus(payment.status);
  }

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Edit payment"
      subtitle={payment?.receiptId ?? ""}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (payment) store.updatePayment(payment.id, { amount, date, method, status });
              toast.success("Payment updated");
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount (₹)">
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
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
    </Modal>
  );
}

function ReceiptModal({ payment, onClose }: { payment: Payment | null; onClose: () => void }) {
  const store = useStore();
  if (!payment) return null;
  const student = store.students.find((s) => s.id === payment.studentId);
  const space = store.spaces.find((sp) => sp.studentId === payment.studentId);
  const membership = student ? latestMembership(store.memberships, student.id) : undefined;
  const settings = store.settings;

  return (
    <Modal
      open={!!payment}
      onClose={onClose}
      title="Payment receipt"
      subtitle={payment.receiptId}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer className="size-4" /> Print receipt
          </Button>
        </>
      }
    >
      <div className="print-only-area rounded-2xl border border-line p-6">
        <div className="text-center">
          <p className="font-display text-xl font-semibold">{settings.libraryName}</p>
          <p className="text-xs text-muted-foreground">{settings.address}</p>
          <p className="text-xs text-muted-foreground">
            {settings.phone} · {settings.email}
          </p>
        </div>
        <div className="my-5 border-t border-dashed border-line" />
        <dl className="space-y-2 text-sm">
          <Line label="Receipt No." value={payment.receiptId} />
          <Line label="Date" value={formatDate(payment.date)} />
          <Line label="Student" value={student?.name ?? "—"} />
          <Line label="Student ID" value={student?.code ?? "—"} />
          <Line label="Study Space" value={space?.number ?? "—"} />
          <Line label="Plan" value={payment.planName} />
          <Line
            label="Membership"
            value={
              membership
                ? `${formatDate(membership.startDate)} → ${formatDate(membership.expiryDate)}`
                : "—"
            }
          />
          <Line label="Method" value={payment.method} />
          <Line label="Status" value={payment.status.toUpperCase()} />
        </dl>
        <div className="my-5 border-t border-dashed border-line" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Amount paid</span>
          <span className="font-display text-2xl font-semibold">{inr(payment.amount)}</span>
        </div>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Thank you for studying at {settings.libraryName}. Open {settings.openingHours}.
        </p>
      </div>
    </Modal>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
