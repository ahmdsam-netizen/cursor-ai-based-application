export const INTERESTS = [
  "Tech",
  "Music",
  "Sports",
  "Food",
  "Business",
  "Art",
  "Festivals",
  "Education",
];

export function formatEventDate(iso?: string | null): string {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function googleCalendarUrl(ev: any): string {
  if (!ev?.startDate || !ev?.name) return "#";
  const start = new Date(ev.startDate);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (x: Date) =>
    x.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.name,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: ev.description?.slice(0, 800) || "",
    location: [ev.venue, ev.address, ev.city].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcs(ev: any): void {
  if (!ev?.startDate) return;
  const start = new Date(ev.startDate);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Event Finder//EN",
    "BEGIN:VEVENT",
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${ev.name.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${(ev.description || "").replace(/\n/g, "\\n").slice(0, 2000)}`,
    `LOCATION:${[ev.venue, ev.city].filter(Boolean).join(", ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ev.name.slice(0, 40).replace(/\s+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
