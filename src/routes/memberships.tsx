import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import { daysLeft, latestMembership, membershipState, useStore } from "@/lib/store";
import { formatDate, inr } from "@/lib/format";
import type { Plan } from "@/lib/types";

export const Route = createFileRoute("/memberships")({
  head: () => ({
    meta: [
      { title: "Memberships & Plans — Vision Library" },
      {
        name: "description",
        content:
          "Manage Vision Library membership plans, renewals and expiring memberships for students in Chapra.",
      },
      { property: "og:title", content: "Memberships & Plans — Vision Library" },
      {
        property: "og:description",
        content: "Plans, renewals and expiry tracking for Vision Library members.",
      },
    ],
  }),
  component: MembershipsPage,
});

function MembershipsPage() {
  const store = useStore();
  const actions = useActions();
  const [planModal, setPlanModal] = useState<Plan | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      store.students
        .map((student) => {
          const m = latestMembership(store.memberships, student.id);
          return { student, m, state: membershipState(m), left: daysLeft(m) };
        })
        .sort((a, b) => a.left - b.left),
    [store.students, store.memberships],
  );

  const buckets = [
    { label: "Expires today", items: rows.filter((r) => r.left === 0) },
    { label: "Within 3 days", items: rows.filter((r) => r.left > 0 && r.left <= 3) },
    { label: "Within 7 days", items: rows.filter((r) => r.left > 3 && r.left <= 7) },
    { label: "Within 30 days", items: rows.filter((r) => r.left > 7 && r.left <= 30) },
  ];

  const expired = rows.filter((r) => r.state === "expired");

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle={`${store.plans.length} plans · ${rows.filter((r) => r.state !== "expired").length} active members`}
        actions={
          <>
            <Button onClick={() => setPlanModal("new")}>
              <Plus className="size-4" /> New plan
            </Button>
            <Button variant="primary" onClick={() => actions.openRenew()}>
              Renew membership
            </Button>
          </>
        }
      />

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {store.plans.map((plan) => (
          <Card key={plan.id}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.days} days</p>
              </div>
              <Badge tone={plan.active ? "avail" : "neutral"}>
                {plan.active ? "Active" : "Hidden"}
              </Badge>
            </div>
            <p className="mt-4 font-display text-3xl font-semibold">{inr(plan.price)}</p>
            <p className="mt-2 min-h-8 text-xs text-muted-foreground">{plan.description}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Allowed:{" "}
              {plan.allowedTypeId === "any"
                ? "All space types"
                : (store.spaceTypes.find((t) => t.id === plan.allowedTypeId)?.name ?? "—")}
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => setPlanModal(plan)}>
                Edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setConfirmDelete(plan.id)}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {buckets.map((b) => (
          <Card key={b.label}>
            <p className="text-xs font-medium text-muted-foreground">{b.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold">{b.items.length}</p>
            <div className="mt-3 space-y-1.5">
              {b.items.slice(0, 3).map(({ student }) => (
                <Link
                  key={student.id}
                  to="/students/$studentId"
                  params={{ studentId: student.id }}
                  className="block truncate text-xs font-semibold hover:text-brand"
                >
                  {student.name}
                </Link>
              ))}
              {b.items.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <CardTitle
          title="All memberships"
          subtitle={`${expired.length} expired · renew manually from here`}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="py-2 font-semibold">Student</th>
                <th className="font-semibold">Plan</th>
                <th className="font-semibold">Start</th>
                <th className="font-semibold">Expiry</th>
                <th className="font-semibold">Days left</th>
                <th className="font-semibold">Payment</th>
                <th className="font-semibold">Status</th>
                <th className="text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ student, m, state, left }) => (
                <tr key={student.id}>
                  <td className="py-2.5">
                    <Link
                      to="/students/$studentId"
                      params={{ studentId: student.id }}
                      className="font-semibold hover:text-brand"
                    >
                      {student.name}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">{student.code}</p>
                  </td>
                  <td className="text-muted-foreground">
                    {store.plans.find((p) => p.id === m?.planId)?.name ?? "—"}
                  </td>
                  <td className="text-muted-foreground">
                    {m ? formatDate(m.startDate) : "—"}
                  </td>
                  <td className="text-muted-foreground">{m ? formatDate(m.expiryDate) : "—"}</td>
                  <td className={left < 0 ? "font-semibold text-maint" : "text-muted-foreground"}>
                    {m ? (left < 0 ? `${Math.abs(left)} days ago` : `${left} days`) : "—"}
                  </td>
                  <td>
                    <Badge tone={m?.paymentStatus === "paid" ? "avail" : "resv"}>
                      {(m?.paymentStatus ?? "—").toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={state === "active" ? "avail" : state === "expiring" ? "resv" : "maint"}
                    >
                      {state === "active"
                        ? "Active"
                        : state === "expiring"
                          ? "Expiring soon"
                          : "Expired"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Button size="sm" onClick={() => actions.openRenew(student.id)}>
                      Renew
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <EmptyState title="No members yet" message="Add a student to create the first plan." />
        )}
      </Card>

      <PlanModal plan={planModal} onClose={() => setPlanModal(null)} />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete plan?"
        message="Existing memberships keep their dates, but this plan can no longer be selected."
        confirmLabel="Delete plan"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) store.deletePlan(confirmDelete);
          setConfirmDelete(null);
          toast.success("Plan deleted");
        }}
      />
    </>
  );
}

function PlanModal({ plan, onClose }: { plan: Plan | "new" | null; onClose: () => void }) {
  const store = useStore();
  const isNew = plan === "new";
  const base: Omit<Plan, "id"> =
    plan && plan !== "new"
      ? {
          name: plan.name,
          days: plan.days,
          price: plan.price,
          allowedTypeId: plan.allowedTypeId,
          description: plan.description,
          active: plan.active,
        }
      : { name: "", days: 30, price: 1200, allowedTypeId: "any", description: "", active: true };

  const [form, setForm] = useState(base);
  const [key, setKey] = useState("");
  const currentKey = plan === "new" ? "new" : (plan?.id ?? "");
  if (currentKey !== key) {
    setKey(currentKey);
    setForm(base);
  }

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={isNew ? "New membership plan" : "Edit plan"}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Plan name is required");
                return;
              }
              if (isNew) store.addPlan(form);
              else if (plan) store.updatePlan(plan.id, form);
              toast.success(isNew ? "Plan created" : "Plan updated");
              onClose();
            }}
          >
            {isNew ? "Create plan" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Duration (days)">
          <Input
            type="number"
            value={form.days}
            onChange={(e) => setForm({ ...form, days: Number(e.target.value) })}
          />
        </Field>
        <Field label="Price (₹)">
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
          />
        </Field>
        <Field label="Allowed space type">
          <Select
            value={form.allowedTypeId}
            onChange={(e) => setForm({ ...form, allowedTypeId: e.target.value })}
          >
            <option value="any">All space types</option>
            {store.spaceTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Status">
          <Select
            value={form.active ? "active" : "hidden"}
            onChange={(e) => setForm({ ...form, active: e.target.value === "active" })}
          >
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
