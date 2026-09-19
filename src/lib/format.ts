export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayISO = () => toISODate(new Date());

export const addDays = (iso: string, days: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const daysBetween = (fromISO: string, toISOStr: string) => {
  const a = new Date(fromISO + "T00:00:00").getTime();
  const b = new Date(toISOStr + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length > 10 ? iso : iso + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
};

export const durationLabel = (fromISO: string, toISOStr: string | number) => {
  const end = typeof toISOStr === "number" ? toISOStr : new Date(toISOStr).getTime();
  const ms = Math.max(0, end - new Date(fromISO).getTime());
  const mins = Math.floor(ms / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

export const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
