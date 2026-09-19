import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  statusLabel,
  statusTone,
} from "@/components/kit";
import { useActions } from "@/components/actions";
import { latestMembership, membershipState, openAttendance, useStore } from "@/lib/store";
import { formatDate, inr } from "@/lib/format";
import type { Space, SpaceStatus } from "@/lib/types";

export const Route = createFileRoute("/seating")({
  head: () => ({
    meta: [
      { title: "Seating Arrangement — Vision Library" },
      {
        name: "description",
        content:
          "Visual floor plan of every study seat and personal cabin at Vision Library, Chapra with live occupancy status.",
      },
      { property: "og:title", content: "Seating Arrangement — Vision Library" },
      {
        property: "og:description",
        content: "Live floor plan of seats and cabins with occupancy, reservations and maintenance.",
      },
    ],
  }),
  component: SeatingPage,
});

const STATUSES: SpaceStatus[] = ["available", "occupied", "reserved", "maintenance"];

function SeatingPage() {
  const store = useStore();
  const actions = useActions();
  const [floorId, setFloorId] = useState("all");
  const [sectionId, setSectionId] = useState("all");
  const [typeId, setTypeId] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Space | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      store.spaces.filter(
        (s) =>
          (floorId === "all" || s.floorId === floorId) &&
          (sectionId === "all" || s.sectionId === sectionId) &&
          (typeId === "all" || s.typeId === typeId) &&
          (status === "all" || s.status === status) &&
          (!query || s.number.toLowerCase().includes(query.trim().toLowerCase())),
      ),
    [store.spaces, floorId, sectionId, typeId, status, query],
  );

  const counts = STATUSES.map((st) => ({
    st,
    n: store.spaces.filter((s) => s.status === st).length,
  }));

  const current = selected ? store.spaces.find((s) => s.id === selected.id) ?? null : null;
  const occupant = current?.studentId
    ? store.students.find((s) => s.id === current.studentId)
    : undefined;
  const membership = occupant ? latestMembership(store.memberships, occupant.id) : undefined;

  return (
    <>
      <PageHeader
        title="Seating Arrangement"
        subtitle={`${store.spaces.length} study spaces across ${store.floors.length} floors`}
        actions={
          <>
            <Button onClick={() => setBuilderOpen(true)}>Layout builder</Button>
            <Button variant="primary" onClick={() => actions.openAssign()}>
              Assign space
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Floor">
            <Select
              value={floorId}
              onChange={(e) => {
                setFloorId(e.target.value);
                setSectionId("all");
              }}
            >
              <option value="all">All floors</option>
              {store.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="all">All sections</option>
              {store.sections
                .filter((s) => floorId === "all" || s.floorId === floorId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Space Type">
            <Select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="all">All types</option>
              {store.spaceTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Search">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Seat or cabin no. e.g. C-12"
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5 border-t border-line pt-4 text-xs text-muted-foreground">
          {counts.map(({ st, n }) => (
            <span key={st} className="flex items-center gap-1.5">
              <span
                className={`size-2.5 rounded-full ${
                  st === "available"
                    ? "bg-avail"
                    : st === "occupied"
                      ? "bg-occ"
                      : st === "reserved"
                        ? "bg-resv"
                        : "bg-maint"
                }`}
              />
              {statusLabel[st]} · {n}
            </span>
          ))}
          <span className="ml-auto">{visible.length} matching spaces</span>
        </div>
      </Card>

      {visible.length === 0 && (
        <EmptyState title="No spaces match" message="Try clearing the filters or search." />
      )}

      {store.floors
        .filter((f) => floorId === "all" || f.id === floorId)
        .map((floor) => {
          const sections = store.sections.filter(
            (s) => s.floorId === floor.id && (sectionId === "all" || s.id === sectionId),
          );
          const floorSpaces = visible.filter((s) => s.floorId === floor.id);
          if (floorSpaces.length === 0) return null;
          return (
            <Card key={floor.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">
                  Vision Library — {floor.name}
                </h2>
                <Badge>{floorSpaces.length} spaces</Badge>
              </div>
              <div className="space-y-5">
                {sections.map((sec) => {
                  const spaces = floorSpaces.filter((s) => s.sectionId === sec.id);
                  if (spaces.length === 0) return null;
                  return (
                    <div key={sec.id}>
                      <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                        {sec.name}
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
                        {spaces.map((sp) => (
                          <SpaceCard
                            key={sp.id}
                            space={sp}
                            name={
                              store.students.find((s) => s.id === sp.studentId)?.name ?? null
                            }
                            onClick={() => setSelected(sp)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

      {/* DETAIL PANEL */}
      <Drawer
        open={!!current}
        onClose={() => setSelected(null)}
        subtitle="Space detail"
        title={current ? current.number : ""}
        footer={
          current && (
            <div className="grid grid-cols-2 gap-2">
              {current.studentId ? (
                <>
                  <Button
                    variant="primary"
                    className="col-span-2"
                    onClick={() => {
                      store.releaseSpace(current.id);
                      toast.success(`${current.number} released`);
                      setSelected(null);
                    }}
                  >
                    Release Space
                  </Button>
                  <Button onClick={() => actions.openAssign(current.studentId!)}>
                    Change Seat
                  </Button>
                  <Link
                    to="/students/$studentId"
                    params={{ studentId: current.studentId }}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-card text-sm font-semibold"
                  >
                    View Student
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    className="col-span-2"
                    onClick={() => actions.openAssign()}
                  >
                    Assign Student
                  </Button>
                  <Button
                    onClick={() => {
                      const err = store.setSpaceStatus(
                        current.id,
                        current.status === "maintenance" ? "available" : "maintenance",
                      );
                      if (err) toast.error(err);
                      else toast.success("Status updated");
                    }}
                  >
                    {current.status === "maintenance" ? "Mark Available" : "Mark Maintenance"}
                  </Button>
                  <Button
                    onClick={() => {
                      const err = store.setSpaceStatus(
                        current.id,
                        current.status === "reserved" ? "available" : "reserved",
                      );
                      if (err) toast.error(err);
                      else toast.success("Status updated");
                    }}
                  >
                    {current.status === "reserved" ? "Clear Reserve" : "Mark Reserved"}
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {current && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[current.status]}>{statusLabel[current.status]}</Badge>
              <span className="text-xs text-muted-foreground">
                {store.spaceTypes.find((t) => t.id === current.typeId)?.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Floor" value={store.floors.find((f) => f.id === current.floorId)?.name} />
              <Info
                label="Section"
                value={store.sections.find((s) => s.id === current.sectionId)?.name}
              />
              <Info label="Monthly Price" value={inr(current.price)} />
              <Info label="Space ID" value={current.number} />
            </div>

            {occupant ? (
              <div className="rounded-2xl border border-line p-4">
                <p className="font-semibold">{occupant.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {occupant.code} · {occupant.phone}
                </p>
                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row
                    label="Plan"
                    value={store.plans.find((p) => p.id === membership?.planId)?.name ?? "—"}
                  />
                  <Row
                    label="Membership"
                    value={
                      membership
                        ? `${formatDate(membership.startDate)} → ${formatDate(membership.expiryDate)}`
                        : "—"
                    }
                  />
                  <Row
                    label="Status"
                    value={
                      <Badge
                        tone={
                          membershipState(membership) === "active"
                            ? "avail"
                            : membershipState(membership) === "expiring"
                              ? "resv"
                              : "maint"
                        }
                      >
                        {membershipState(membership)}
                      </Badge>
                    }
                  />
                  <Row
                    label="Payment"
                    value={(membership?.paymentStatus ?? "—").toUpperCase()}
                  />
                  <Row
                    label="Inside now"
                    value={openAttendance(store.attendance, occupant.id) ? "Yes" : "No"}
                  />
                </dl>
              </div>
            ) : (
              <EmptyState title="No student assigned" message="This space is free to allocate." />
            )}

            <Field label="Notes">
              <Input
                value={current.notes}
                onChange={(e) => store.updateSpace(current.id, { notes: e.target.value })}
                placeholder="Near window, power socket…"
              />
            </Field>

            <button
              onClick={() => setConfirmDelete(current.id)}
              className="flex items-center gap-2 text-xs font-semibold text-maint"
            >
              <Trash2 className="size-3.5" /> Delete this space
            </button>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete space?"
        message="This removes the space from the layout. Any assigned student will be unassigned."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) store.deleteSpace(confirmDelete);
          setConfirmDelete(null);
          setSelected(null);
          toast.success("Space deleted");
        }}
      />

      <LayoutBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </>
  );
}

function SpaceCard({
  space,
  name,
  onClick,
}: {
  space: Space;
  name: string | null;
  onClick: () => void;
}) {
  const color =
    space.status === "occupied"
      ? "bg-occ/10 border-occ/30 text-occ"
      : space.status === "available"
        ? "bg-avail/10 border-avail/30 text-avail"
        : space.status === "reserved"
          ? "bg-resv/10 border-resv/30 text-resv"
          : "bg-maint/10 border-maint/30 text-maint";
  const dot =
    space.status === "occupied"
      ? "bg-occ"
      : space.status === "available"
        ? "bg-avail"
        : space.status === "reserved"
          ? "bg-resv"
          : "bg-maint";
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 ${color}`}
    >
      <p className="text-[11px] font-bold">{space.number}</p>
      <p className="mt-1 truncate text-xs font-semibold text-foreground">
        {name ?? (space.status === "available" ? "Free" : statusLabel[space.status])}
      </p>
      <span className={`mt-2 inline-block size-2 rounded-full ${dot}`} />
    </button>
  );
}

function Info({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value ?? "—"}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/* ---------------- Layout builder ---------------- */

function LayoutBuilder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const [floorName, setFloorName] = useState("");
  const [sectionFloor, setSectionFloor] = useState(store.floors[0]?.id ?? "");
  const [sectionName, setSectionName] = useState("");
  const [spaceSection, setSpaceSection] = useState(store.sections[0]?.id ?? "");
  const [spaceType, setSpaceType] = useState(store.spaceTypes[0]?.id ?? "");
  const [spaceNumber, setSpaceNumber] = useState("");
  const [spacePrice, setSpacePrice] = useState(store.spaceTypes[0]?.defaultPrice ?? 900);
  const [typeName, setTypeName] = useState("");
  const [typePrice, setTypePrice] = useState(1000);

  useEffect(() => {
    if (store.floors.length > 0 && !store.floors.find((f) => f.id === sectionFloor)) {
      setSectionFloor(store.floors[0].id);
    }
  }, [store.floors, sectionFloor]);

  useEffect(() => {
    if (store.sections.length > 0 && !store.sections.find((s) => s.id === spaceSection)) {
      setSpaceSection(store.sections[0].id);
    }
  }, [store.sections, spaceSection]);

  useEffect(() => {
    if (store.spaceTypes.length > 0 && !store.spaceTypes.find((t) => t.id === spaceType)) {
      const t = store.spaceTypes[0];
      setSpaceType(t.id);
      setSpacePrice(t.defaultPrice);
    }
  }, [store.spaceTypes, spaceType]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Layout Builder"
      subtitle="Configure floors, sections, space types and individual spaces"
    >
      <div className="space-y-6">
        <section>
          <h3 className="mb-3 font-display text-base font-semibold">Floors</h3>
          <div className="mb-3 space-y-2">
            {store.floors.map((f) => (
              <div key={f.id} className="flex items-center gap-2">
                <Input
                  value={f.name}
                  onChange={(e) => store.updateFloor(f.id, e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    store.deleteFloor(f.id);
                    toast.success("Floor deleted");
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              placeholder="Floor 4"
            />
            <Button
              onClick={() => {
                if (!floorName.trim()) return;
                store.addFloor(floorName.trim());
                setFloorName("");
                toast.success("Floor added");
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-display text-base font-semibold">Sections</h3>
          <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
            {store.sections.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-24 text-xs text-muted-foreground">
                  {store.floors.find((f) => f.id === s.floorId)?.name}
                </span>
                <Input
                  value={s.name}
                  onChange={(e) => store.updateSection(s.id, e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" variant="danger" onClick={() => store.deleteSection(s.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={sectionFloor}
              onChange={(e) => setSectionFloor(e.target.value)}
              className="max-w-40"
            >
              {store.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Input
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Section G"
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (!sectionName.trim() || !sectionFloor) return;
                store.addSection(sectionFloor, sectionName.trim());
                setSectionName("");
                toast.success("Section added");
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-display text-base font-semibold">Space Types</h3>
          <div className="mb-3 space-y-2">
            {store.spaceTypes.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <Input
                  value={t.name}
                  onChange={(e) => store.updateSpaceType(t.id, { name: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={t.defaultPrice}
                  onChange={(e) =>
                    store.updateSpaceType(t.id, { defaultPrice: Number(e.target.value) })
                  }
                  className="max-w-28"
                />
                <Button size="sm" variant="danger" onClick={() => store.deleteSpaceType(t.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Executive Cabin"
              className="flex-1"
            />
            <Input
              type="number"
              value={typePrice}
              onChange={(e) => setTypePrice(Number(e.target.value))}
              className="max-w-28"
            />
            <Button
              onClick={() => {
                if (!typeName.trim()) return;
                store.addSpaceType({ name: typeName.trim(), defaultPrice: typePrice });
                setTypeName("");
                toast.success("Space type added");
              }}
            >
              <Plus className="size-4" /> Add
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-3 font-display text-base font-semibold">Add Space</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Section">
              <Select value={spaceSection} onChange={(e) => setSpaceSection(e.target.value)}>
                {store.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {store.floors.find((f) => f.id === s.floorId)?.name} · {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select
                value={spaceType}
                onChange={(e) => {
                  setSpaceType(e.target.value);
                  const t = store.spaceTypes.find((x) => x.id === e.target.value);
                  if (t) setSpacePrice(t.defaultPrice);
                }}
              >
                {store.spaceTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Number">
              <Input
                value={spaceNumber}
                onChange={(e) => setSpaceNumber(e.target.value)}
                placeholder="A-17"
              />
            </Field>
            <Field label="Monthly Price (₹)">
              <Input
                type="number"
                value={spacePrice}
                onChange={(e) => setSpacePrice(Number(e.target.value))}
              />
            </Field>
          </div>
          <Button
            className="mt-3"
            variant="primary"
            onClick={() => {
              const section = store.sections.find((s) => s.id === spaceSection);
              if (!section || !spaceNumber.trim()) return;
              store.addSpace({
                number: spaceNumber.trim().toUpperCase(),
                floorId: section.floorId,
                sectionId: section.id,
                typeId: spaceType,
                status: "available",
                price: spacePrice,
                notes: "",
              });
              setSpaceNumber("");
              toast.success("Space added");
            }}
          >
            <Plus className="size-4" /> Add Space
          </Button>
        </section>
      </div>
    </Modal>
  );
}
