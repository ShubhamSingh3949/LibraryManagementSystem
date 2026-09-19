export type SpaceStatus = "available" | "occupied" | "reserved" | "maintenance";
export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Other";
export type PaymentStatus = "paid" | "pending" | "overdue" | "partial";

export interface Floor {
  id: string;
  name: string;
}

export interface Section {
  id: string;
  floorId: string;
  name: string;
}

export interface SpaceType {
  id: string;
  name: string;
  defaultPrice: number;
}

export interface Space {
  id: string;
  number: string;
  floorId: string;
  sectionId: string;
  typeId: string;
  status: SpaceStatus;
  price: number;
  studentId: string | null;
  notes: string;
}

export interface Student {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joiningDate: string;
  emergencyContact: string;
  notes: string;
  active: boolean;
}

export interface Plan {
  id: string;
  name: string;
  days: number;
  price: number;
  allowedTypeId: string | "any";
  description: string;
  active: boolean;
}

export interface Membership {
  id: string;
  studentId: string;
  planId: string;
  startDate: string;
  expiryDate: string;
  amount: number;
  paymentStatus: PaymentStatus;
}

export interface Payment {
  id: string;
  receiptId: string;
  studentId: string;
  membershipId: string | null;
  planName: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
}

export interface Attendance {
  id: string;
  studentId: string;
  spaceId: string | null;
  checkIn: string;
  checkOut: string | null;
}

export interface Settings {
  libraryName: string;
  address: string;
  phone: string;
  email: string;
  ownerName: string;
  openingHours: string;
}

export interface LibraryState {
  floors: Floor[];
  sections: Section[];
  spaceTypes: SpaceType[];
  spaces: Space[];
  students: Student[];
  plans: Plan[];
  memberships: Membership[];
  payments: Payment[];
  attendance: Attendance[];
  settings: Settings;
}

export type MembershipState = "active" | "expiring" | "expired" | "none";
