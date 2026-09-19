import type {
  Attendance,
  LibraryState,
  Membership,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Section,
  Space,
  SpaceStatus,
  Student,
} from "./types";
import { addDays, toISODate, todayISO } from "./format";

// Deterministic pseudo-random generator so SSR and client agree.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Mock names removed

export const INITIAL_FLOORS: any[] = [];
export const INITIAL_SPACE_TYPES: any[] = [];
export const INITIAL_SECTIONS: any[] = [];

export const INITIAL_SPACES: Space[] = [];
export const INITIAL_PLANS: any[] = [];

  const attendance: Attendance[] = [];

export function buildDemoState(): LibraryState {
  const students: Student[] = [];
  const memberships: Membership[] = [];
  const payments: Payment[] = [];
  const attendance: Attendance[] = [];

  // No mock data generated

  return {
    floors: INITIAL_FLOORS,
    sections: INITIAL_SECTIONS,
    spaceTypes: INITIAL_SPACE_TYPES,
    spaces: INITIAL_SPACES,
    students,
    plans: INITIAL_PLANS,
    memberships,
    payments,
    attendance,
    settings: {
      libraryName: "Vision Library",
      address: "Nehru Chowk, Chapra, Bihar 841301",
      phone: "+91 98350 42117",
      email: "visionlibrary.chapra@gmail.com",
      ownerName: "Anil Verma",
      openingHours: "6:00 AM – 10:00 PM",
    },
  };
}

export const DEMO_TODAY = toISODate(new Date());
