import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
} from "@/components/kit";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Vision Library" },
      {
        name: "description",
        content:
          "Library details, owner profile and demo data controls for the Vision Library owner console in Chapra.",
      },
      { property: "og:title", content: "Settings — Vision Library" },
      {
        property: "og:description",
        content: "Library profile, contact details and data controls.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const store = useStore();
  const [form, setForm] = useState(store.settings);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <PageHeader title="Settings" subtitle="Library profile and console preferences" />

      <Card>
        <CardTitle title="Library details" subtitle="Shown on receipts and reports" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Library name">
            <Input
              value={form.libraryName}
              onChange={(e) => setForm({ ...form, libraryName: e.target.value })}
            />
          </Field>
          <Field label="Owner name">
            <Input
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Opening hours">
            <Input
              value={form.openingHours}
              onChange={(e) => setForm({ ...form, openingHours: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
        </div>
        <Button
          className="mt-4"
          variant="primary"
          onClick={() => {
            store.updateSettings(form);
            toast.success("Settings saved");
          }}
        >
          Save settings
        </Button>
      </Card>

      <Card>
        <CardTitle title="Library data" subtitle="Everything is stored on this device" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Students", value: store.students.length },
            { label: "Study spaces", value: store.spaces.length },
            { label: "Payments", value: store.payments.length },
            { label: "Attendance records", value: store.attendance.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-background p-4 text-center">
              <p className="font-display text-2xl font-semibold">{s.value}</p>
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const data = JSON.stringify(
                {
                  floors: store.floors,
                  sections: store.sections,
                  spaceTypes: store.spaceTypes,
                  spaces: store.spaces,
                  students: store.students,
                  plans: store.plans,
                  memberships: store.memberships,
                  payments: store.payments,
                  attendance: store.attendance,
                  settings: store.settings,
                },
                null,
                2,
              );
              const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
              const a = document.createElement("a");
              a.href = url;
              a.download = "vision-library-backup.json";
              a.click();
              URL.revokeObjectURL(url);
              toast.success("Backup downloaded");
            }}
          >
            Download backup
          </Button>
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset to demo data
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        message="This erases every student, payment and attendance record and restores the demo library."
        confirmLabel="Reset everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          store.resetDemoData();
          setConfirmReset(false);
          toast.success("Demo data restored");
        }}
      />
    </>
  );
}
