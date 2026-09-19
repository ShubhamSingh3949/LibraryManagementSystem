import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildDemoState } from "./demo-data";
import { addDays, daysBetween, todayISO } from "./format";
import type {
  Attendance,
  LibraryState,
  Membership,
  MembershipState,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Plan,
  Settings,
  Space,
  SpaceStatus,
  SpaceType,
  Student,
} from "./types";

const STORAGE_KEY = "vision-library-state-v2";

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function fireSync(promise: any) {
  Promise.resolve(promise).catch((err: any) => console.error("Sync error:", err));
}

export interface StoreValue extends LibraryState {
  hydrated: boolean;
  // students
  addStudent: (
    data: Omit<Student, "id" | "active"> & Partial<Pick<Student, "active">>,
  ) => Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  // spaces
  addSpace: (data: Omit<Space, "id" | "studentId">) => void;
  updateSpace: (id: string, patch: Partial<Space>) => void;
  deleteSpace: (id: string) => void;
  setSpaceStatus: (id: string, status: SpaceStatus) => string | null;
  assignSpace: (spaceId: string, studentId: string) => string | null;
  releaseSpace: (spaceId: string) => void;
  // layout
  addFloor: (name: string) => void;
  updateFloor: (id: string, name: string) => void;
  deleteFloor: (id: string) => void;
  addSection: (floorId: string, name: string) => void;
  updateSection: (id: string, name: string) => void;
  deleteSection: (id: string) => void;
  addSpaceType: (data: Omit<SpaceType, "id">) => void;
  updateSpaceType: (id: string, patch: Partial<SpaceType>) => void;
  deleteSpaceType: (id: string) => void;
  // plans + memberships
  addPlan: (data: Omit<Plan, "id">) => void;
  updatePlan: (id: string, patch: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  createMembership: (input: {
    studentId: string;
    planId: string;
    startDate: string;
    amount: number;
    paymentStatus: PaymentStatus;
  }) => Membership;
  // payments
  addPayment: (input: {
    studentId: string;
    membershipId?: string | null;
    planName: string;
    amount: number;
    date: string;
    method: PaymentMethod;
    status: PaymentStatus;
  }) => Payment;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  // attendance
  checkIn: (studentId: string) => string | null;
  checkOut: (studentId: string) => string | null;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>(() => buildDemoState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function loadData() {
      let localState = buildDemoState();
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          localState = JSON.parse(raw) as LibraryState;
          setState(localState);
        }
      } catch {
        /* ignore corrupt storage */
      }

      try {
        const { data: floors } = await supabase.from("floors").select("*");
        const { data: sections } = await supabase.from("sections").select("*");
        const { data: spaceTypes } = await supabase.from("space_types").select("*");
        const { data: spaces } = await supabase.from("spaces").select("*");
        const { data: plans } = await supabase.from("plans").select("*");

        let newState = { ...localState };

        if (floors && floors.length > 0) {
          // Map DB snake_case back to TS camelCase
          newState.floors = floors;
          newState.sections = sections?.map(s => ({ ...s, floorId: s.floor_id })) || [];
          newState.spaceTypes = spaceTypes?.map(s => ({ ...s, defaultPrice: s.default_price })) || [];
          newState.spaces = spaces?.map(s => ({
            ...s, floorId: s.floor_id, sectionId: s.section_id, typeId: s.type_id, studentId: s.student_id
          })) || [];
          newState.plans = plans?.map(p => ({ ...p, allowedTypeId: p.allowed_type_id })) || [];
          setState(newState);
        } else {
          // Empty database, do nothing. User starts from blank.
          newState.floors = [];
          newState.sections = [];
          newState.spaceTypes = [];
          newState.spaces = [];
          newState.plans = [];
          setState(newState);
        }
      } catch (err) {
        console.error("Supabase sync failed:", err);
      }
      setHydrated(true);
    }
    
    loadData();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota */
    }
  }, [state, hydrated]);

  const patchState = useCallback(
    (fn: (s: LibraryState) => LibraryState) => setState((s) => fn(s)),
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const addStudent: StoreValue["addStudent"] = (data) => {
      const student: Student = { id: uid("st"), active: true, ...data };
      setState((s) => ({ ...s, students: [student, ...s.students] }));
      return student;
    };

    const assignSpace: StoreValue["assignSpace"] = (spaceId, studentId) => {
      let error: string | null = null;
      setState((s) => {
        const space = s.spaces.find((sp) => sp.id === spaceId);
        if (!space) return s;
        if (space.status === "maintenance") {
          error = "This space is under maintenance and cannot be assigned.";
          return s;
        }
        if (space.studentId && space.studentId !== studentId) {
          error = "This space already has an assigned student.";
          return s;
        }
        return {
          ...s,
          spaces: s.spaces.map((sp) => {
            if (sp.studentId === studentId && sp.id !== spaceId) {
              fireSync(supabase.from("spaces").update({ student_id: null, status: "available" }).eq("id", sp.id));
              return { ...sp, studentId: null, status: "available" as SpaceStatus };
            }
            if (sp.id === spaceId) {
              fireSync(supabase.from("spaces").update({ student_id: studentId, status: "occupied" }).eq("id", sp.id));
              return { ...sp, studentId, status: "occupied" as SpaceStatus };
            }
            return sp;
          }),
        };
      });
      return error;
    };

    const createMembership: StoreValue["createMembership"] = (input) => {
      const plan = state.plans.find((p) => p.id === input.planId);
      const membership: Membership = {
        id: uid("mb"),
        studentId: input.studentId,
        planId: input.planId,
        startDate: input.startDate,
        expiryDate: addDays(input.startDate, plan ? plan.days : 30),
        amount: input.amount,
        paymentStatus: input.paymentStatus,
      };
      setState((s) => ({ ...s, memberships: [...s.memberships, membership] }));
      return membership;
    };

    const addPayment: StoreValue["addPayment"] = (input) => {
      const payment: Payment = {
        id: uid("pm"),
        receiptId: `VL/26/${Math.floor(3000 + Math.random() * 6999)}`,
        membershipId: input.membershipId ?? null,
        ...input,
      };
      setState((s) => ({ ...s, payments: [payment, ...s.payments] }));
      return payment;
    };

    const checkIn: StoreValue["checkIn"] = (studentId) => {
      let error: string | null = null;
      setState((s) => {
        const open = s.attendance.find((a) => a.studentId === studentId && !a.checkOut);
        if (open) {
          error = "This student is already checked in.";
          return s;
        }
        const space = s.spaces.find((sp) => sp.studentId === studentId);
        const record: Attendance = {
          id: uid("at"),
          studentId,
          spaceId: space ? space.id : null,
          checkIn: new Date().toISOString(),
          checkOut: null,
        };
        return { ...s, attendance: [...s.attendance, record] };
      });
      return error;
    };

    const checkOut: StoreValue["checkOut"] = (studentId) => {
      let error: string | null = null;
      setState((s) => {
        const open = s.attendance.find((a) => a.studentId === studentId && !a.checkOut);
        if (!open) {
          error = "This student is not currently checked in.";
          return s;
        }
        return {
          ...s,
          attendance: s.attendance.map((a) =>
            a.id === open.id ? { ...a, checkOut: new Date().toISOString() } : a,
          ),
        };
      });
      return error;
    };

    const setSpaceStatus: StoreValue["setSpaceStatus"] = (id, status) => {
      let error: string | null = null;
      setState((s) => {
        const space = s.spaces.find((sp) => sp.id === id);
        if (!space) return s;
        if (status === "maintenance" && space.studentId) {
          error = "Release the assigned student before marking maintenance.";
          return s;
        }
        if (status === "occupied" && !space.studentId) {
          error = "Assign a student to mark this space occupied.";
          return s;
        }
        fireSync(supabase.from("spaces").update({ status }).eq("id", id));
        return { ...s, spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, status } : sp)) };
      });
      return error;
    };

    return {
      ...state,
      hydrated,
      addStudent,
      updateStudent: (id, patch) =>
        patchState((s) => ({
          ...s,
          students: s.students.map((st) => (st.id === id ? { ...st, ...patch } : st)),
        })),
      deleteStudent: (id) =>
        patchState((s) => ({
          ...s,
          students: s.students.filter((st) => st.id !== id),
          spaces: s.spaces.map((sp) =>
            sp.studentId === id
              ? { ...sp, studentId: null, status: "available" as SpaceStatus }
              : sp,
          ),
          memberships: s.memberships.filter((m) => m.studentId !== id),
          attendance: s.attendance.filter((a) => a.studentId !== id),
        })),
      addSpace: (data) => {
        const id = uid("sp");
        fireSync(supabase.from("spaces").insert({ id, number: data.number, floor_id: data.floorId, section_id: data.sectionId, type_id: data.typeId, status: data.status, price: data.price, student_id: null, notes: data.notes }));
        patchState((s) => ({ ...s, spaces: [...s.spaces, { ...data, id, studentId: null }] }));
      },
      updateSpace: (id, patch) => {
        const dbPatch: any = { ...patch };
        if (patch.floorId) dbPatch.floor_id = patch.floorId;
        if (patch.sectionId) dbPatch.section_id = patch.sectionId;
        if (patch.typeId) dbPatch.type_id = patch.typeId;
        if (patch.studentId) dbPatch.student_id = patch.studentId;
        delete dbPatch.floorId; delete dbPatch.sectionId; delete dbPatch.typeId; delete dbPatch.studentId;
        fireSync(supabase.from("spaces").update(dbPatch).eq("id", id));
        patchState((s) => ({ ...s, spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) }));
      },
      deleteSpace: (id) => {
        fireSync(supabase.from("spaces").delete().eq("id", id));
        patchState((s) => ({ ...s, spaces: s.spaces.filter((sp) => sp.id !== id) }));
      },
      setSpaceStatus,
      assignSpace,
      releaseSpace: (spaceId) => {
        fireSync(supabase.from("spaces").update({ student_id: null, status: "available" }).eq("id", spaceId));
        patchState((s) => ({
          ...s,
          spaces: s.spaces.map((sp) => sp.id === spaceId ? { ...sp, studentId: null, status: "available" as SpaceStatus } : sp),
        }));
      },
      addFloor: (name) => {
        const id = uid("f");
        fireSync(supabase.from("floors").insert({ id, name }));
        patchState((s) => ({ ...s, floors: [...s.floors, { id, name }] }));
      },
      updateFloor: (id, name) => {
        fireSync(supabase.from("floors").update({ name }).eq("id", id));
        patchState((s) => ({ ...s, floors: s.floors.map((f) => (f.id === id ? { ...f, name } : f)) }));
      },
      deleteFloor: (id) => {
        fireSync(supabase.from("floors").delete().eq("id", id));
        patchState((s) => {
          const secIds = s.sections.filter((x) => x.floorId === id).map((x) => x.id);
          return {
            ...s,
            floors: s.floors.filter((f) => f.id !== id),
            sections: s.sections.filter((x) => x.floorId !== id),
            spaces: s.spaces.filter((sp) => !secIds.includes(sp.sectionId)),
          };
        });
      },
      addSection: (floorId, name) => {
        const id = uid("sec");
        fireSync(supabase.from("sections").insert({ id, floor_id: floorId, name }));
        patchState((s) => ({ ...s, sections: [...s.sections, { id, floorId, name }] }));
      },
      updateSection: (id, name) => {
        fireSync(supabase.from("sections").update({ name }).eq("id", id));
        patchState((s) => ({ ...s, sections: s.sections.map((x) => (x.id === id ? { ...x, name } : x)) }));
      },
      deleteSection: (id) => {
        fireSync(supabase.from("sections").delete().eq("id", id));
        patchState((s) => ({
          ...s,
          sections: s.sections.filter((x) => x.id !== id),
          spaces: s.spaces.filter((sp) => sp.sectionId !== id),
        }));
      },
      addSpaceType: (data) => {
        const id = uid("t");
        fireSync(supabase.from("space_types").insert({ id, name: data.name, default_price: data.defaultPrice }));
        patchState((s) => ({ ...s, spaceTypes: [...s.spaceTypes, { ...data, id }] }));
      },
      updateSpaceType: (id, patch) => {
        const dbPatch: any = { ...patch };
        if (patch.defaultPrice) dbPatch.default_price = patch.defaultPrice;
        delete dbPatch.defaultPrice;
        fireSync(supabase.from("space_types").update(dbPatch).eq("id", id));
        patchState((s) => ({ ...s, spaceTypes: s.spaceTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
      },
      deleteSpaceType: (id) => {
        fireSync(supabase.from("space_types").delete().eq("id", id));
        patchState((s) => ({ ...s, spaceTypes: s.spaceTypes.filter((t) => t.id !== id) }));
      },
      addPlan: (data) => {
        const id = uid("p");
        fireSync(supabase.from("plans").insert({ id, name: data.name, days: data.days, price: data.price, allowed_type_id: data.allowedTypeId, description: data.description, active: data.active }));
        patchState((s) => ({ ...s, plans: [...s.plans, { ...data, id }] }));
      },
      updatePlan: (id, patch) => {
        const dbPatch: any = { ...patch };
        if (patch.allowedTypeId) dbPatch.allowed_type_id = patch.allowedTypeId;
        delete dbPatch.allowedTypeId;
        fireSync(supabase.from("plans").update(dbPatch).eq("id", id));
        patchState((s) => ({ ...s, plans: s.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },
      deletePlan: (id) => {
        fireSync(supabase.from("plans").delete().eq("id", id));
        patchState((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== id) }));
      },
      createMembership,
      addPayment,
      updatePayment: (id, patch) =>
        patchState((s) => ({
          ...s,
          payments: s.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      checkIn,
      checkOut,
      updateSettings: (patch) =>
        patchState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      resetDemoData: () => setState(buildDemoState()),
    };
  }, [state, hydrated, patchState]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/* ---------- derived helpers ---------- */

export function latestMembership(memberships: Membership[], studentId: string) {
  return memberships
    .filter((m) => m.studentId === studentId)
    .sort((a, b) => (a.expiryDate < b.expiryDate ? 1 : -1))[0];
}

export function membershipState(m?: Membership): MembershipState {
  if (!m) return "none";
  const days = daysBetween(todayISO(), m.expiryDate);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
}

export function daysLeft(m?: Membership) {
  if (!m) return 0;
  return daysBetween(todayISO(), m.expiryDate);
}

export function openAttendance(attendance: Attendance[], studentId: string) {
  return attendance.find((a) => a.studentId === studentId && !a.checkOut);
}

export function useNow(intervalMs = 60000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
