import { getSampleEventsWithDates } from "../data/sampleEvents.js";
import { prisma, isDbConnected } from "../config/db.js";

export interface AppEvent {
  id: string;
  source: string;
  name: string;
  description: string;
  startDate: string;
  venue: string;
  address: string;
  city: string;
  stateCode: string;
  countryCode: string;
  lat: number;
  lng: number;
  category: string;
  image: string;
  url: string | null;
  priceRange: string;
  organizer: string;
  structuredDescription?: any;
}

export function docToAppEvent(doc: any): AppEvent | null {
  if (!doc) return null;
  return {
    id: doc.id,
    source: "organizer",
    name: doc.name,
    description: doc.description || "",
    startDate: doc.startDate,
    venue: doc.venue || "",
    address: doc.address || "",
    city: doc.city,
    stateCode: doc.stateCode || "",
    countryCode: doc.countryCode,
    lat: doc.lat,
    lng: doc.lng,
    category: doc.category,
    image: doc.image || "",
    url: doc.url || null,
    priceRange: doc.priceRange || "paid",
    organizer: doc.organizer,
    structuredDescription: doc.structuredDescription || null,
  };
}

/** Sample events plus organizer-created events (PostgreSQL / Prisma), for search and detail. */
export async function getCatalogEventsWithDates(): Promise<any[]> {
  const sample = getSampleEventsWithDates();
  if (!isDbConnected()) return sample;
  try {
    const docs = await prisma.organizerEvent.findMany({
      orderBy: { createdAt: "desc" },
    });
    if (!docs.length) return sample;
    return [...sample, ...docs.map(docToAppEvent).filter(Boolean)];
  } catch (err: any) {
    console.warn("Could not query organizer events from PostgreSQL:", err?.message);
    return sample;
  }
}

export async function getOrganizerEventById(id: string): Promise<AppEvent | null> {
  if (!isDbConnected()) return null;
  try {
    const doc = await prisma.organizerEvent.findUnique({ where: { id } });
    return doc ? docToAppEvent(doc) : null;
  } catch (err: any) {
    console.warn("Could not query organizer event by id:", err?.message);
    return null;
  }
}
