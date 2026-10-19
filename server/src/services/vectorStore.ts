/**
 * EventVectorStore: Handles semantic embedding-based vector search and storage for events.
 * Integrates native PostgreSQL pgvector when available, with in-memory hybrid fallback.
 */

import { prisma, isDbConnected } from "../config/db.js";

function cosineSimilarity(vecA: number[] | null, vecB: number[] | null): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface EventMetadata {
  id: string;
  name: string;
  category: string;
  city: string;
  stateCode?: string;
  countryCode: string;
  startDate: string;
  venue?: string;
  address?: string;
  priceRange?: string;
  organizer?: string;
  url?: string | null;
  description?: string;
  structuredDescription?: any;
}

export interface ScoredEvent {
  event: EventMetadata;
  score: number;
}

export interface SearchFilters {
  city?: string;
  category?: string;
  priceRange?: string;
  limit?: number;
}

class EventVectorStore {
  private events: Map<string, { id: string; metadata: EventMetadata; embedding: number[] | null; text: string }>;
  public isSeeded: boolean;

  constructor() {
    this.events = new Map();
    this.isSeeded = false;
  }

  /**
   * Upsert an event into the vector store.
   */
  addEvent(event: any, embedding: number[] | null = null, text = ""): void {
    if (!event || !event.id) return;
    this.events.set(event.id, {
      id: event.id,
      metadata: {
        id: event.id,
        name: event.name,
        category: event.category,
        city: event.city,
        stateCode: event.stateCode || "",
        countryCode: event.countryCode,
        startDate: event.startDate,
        venue: event.venue || "",
        address: event.address || "",
        priceRange: event.priceRange || "paid",
        organizer: event.organizer || "",
        url: event.url || null,
        description: event.description || "",
        structuredDescription: event.structuredDescription || null,
      },
      embedding: Array.isArray(embedding) && embedding.length > 0 ? embedding : null,
      text: text || `${event.name}. ${event.description || ""}. Location: ${event.venue || ""}, ${event.city}. Date: ${event.startDate}`,
    });
  }

  /**
   * Persist embedding to PostgreSQL via pgvector
   */
  async savePgVector(eventId: string, embedding: number[]): Promise<void> {
    if (!isDbConnected() || !Array.isArray(embedding) || embedding.length === 0) return;
    try {
      const vectorLiteral = `[${embedding.join(",")}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "organizer_events" SET embedding = $1::vector WHERE id = $2`,
        vectorLiteral,
        eventId
      );
    } catch (e: any) {
      console.warn("Could not save pgvector embedding:", e?.message);
    }
  }

  /**
   * Retrieve event by ID
   */
  getEventById(id: string): EventMetadata | null {
    const item = this.events.get(id);
    return item ? item.metadata : null;
  }

  /**
   * Search an event by name/title (fuzzy or substring)
   */
  getEventByName(nameQuery: string): EventMetadata | null {
    if (!nameQuery) return null;
    const q = nameQuery.toLowerCase().trim();
    
    for (const item of this.events.values()) {
      const name = (item.metadata.name || "").toLowerCase();
      if (name === q || name.includes(q) || q.includes(name)) {
        return item.metadata;
      }
    }
    return null;
  }

  /**
   * Query PostgreSQL using pgvector cosine distance
   */
  async searchPgVector(queryEmbedding: number[], filters: SearchFilters = {}): Promise<ScoredEvent[]> {
    if (!isDbConnected() || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      return [];
    }

    try {
      const { city, category, priceRange, limit = 5 } = filters;
      const vectorLiteral = `[${queryEmbedding.join(",")}]`;

      const conditions = [`embedding IS NOT NULL`];
      const params: any[] = [vectorLiteral];

      if (city) {
        params.push(String(city).trim().toLowerCase());
        conditions.push(`LOWER(city) = $${params.length}`);
      }
      if (category) {
        params.push(String(category).trim().toLowerCase());
        conditions.push(`LOWER(category) = $${params.length}`);
      }
      if (priceRange) {
        params.push(String(priceRange).trim().toLowerCase());
        conditions.push(`LOWER("priceRange") = $${params.length}`);
      }

      params.push(limit);
      const limitParamIndex = params.length;

      const sql = `
        SELECT id, name, category, city, "stateCode", "countryCode", "startDate", venue, address, "priceRange", organizer, url, description, "structuredDescription",
               1 - (embedding <=> $1::vector) AS similarity
        FROM "organizer_events"
        WHERE ${conditions.join(" AND ")}
        ORDER BY embedding <=> $1::vector
        LIMIT $${limitParamIndex}
      `;

      const rows = (await prisma.$queryRawUnsafe(sql, ...params)) as any[];
      return rows.map((row) => ({
        event: {
          id: row.id,
          name: row.name,
          category: row.category,
          city: row.city,
          stateCode: row.stateCode,
          countryCode: row.countryCode,
          startDate: row.startDate,
          venue: row.venue,
          address: row.address,
          priceRange: row.priceRange,
          organizer: row.organizer,
          url: row.url,
          description: row.description,
          structuredDescription: row.structuredDescription,
        },
        score: Number(row.similarity) || 0,
      }));
    } catch (e: any) {
      console.warn("pgvector query failed, falling back to in-memory:", e?.message);
      return [];
    }
  }

  /**
   * Query the vector store for top matching events (pgvector + in-memory fallback).
   */
  async search(queryEmbedding: number[] | null, rawQuery = "", filters: SearchFilters = {}): Promise<ScoredEvent[]> {
    const { city, category, priceRange, limit = 5 } = filters;

    // Try pgvector if connected
    let pgResults: ScoredEvent[] = [];
    if (isDbConnected() && Array.isArray(queryEmbedding)) {
      pgResults = await this.searchPgVector(queryEmbedding, filters);
    }

    const normalizedCity = city ? String(city).trim().toLowerCase() : null;
    const normalizedCategory = category ? String(category).trim().toLowerCase() : null;
    const normalizedPrice = priceRange ? String(priceRange).trim().toLowerCase() : null;

    const scored: ScoredEvent[] = [];
    const queryTokens = rawQuery ? rawQuery.toLowerCase().split(/\s+/).filter(Boolean) : [];

    for (const item of this.events.values()) {
      if (pgResults.some((r) => r.event.id === item.id)) continue;

      const meta = item.metadata;

      if (normalizedCity && (meta.city || "").toLowerCase() !== normalizedCity) continue;
      if (normalizedCategory && (meta.category || "").toLowerCase() !== normalizedCategory) continue;
      if (normalizedPrice && (meta.priceRange || "").toLowerCase() !== normalizedPrice) continue;

      let score = 0;
      if (queryEmbedding && item.embedding) {
        score = cosineSimilarity(queryEmbedding, item.embedding);
      } else if (queryTokens.length > 0) {
        const docText = (item.text || "").toLowerCase();
        let matches = 0;
        for (const token of queryTokens) {
          if (docText.includes(token)) matches++;
        }
        score = matches / queryTokens.length;
      }

      scored.push({
        event: meta,
        score,
      });
    }

    const combined = [...pgResults, ...scored];
    combined.sort((a, b) => b.score - a.score);
    return combined.slice(0, limit);
  }

  /**
   * Return high-level summary overview
   */
  getOverview(cityFilter: string | null = null, categoryFilter: string | null = null): { totalEvents: number; categories: Record<string, number>; cities: Record<string, number> } {
    const categoriesCount: Record<string, number> = {};
    const citiesCount: Record<string, number> = {};
    let total = 0;

    for (const item of this.events.values()) {
      const meta = item.metadata;
      if (cityFilter && (meta.city || "").toLowerCase() !== cityFilter.toLowerCase()) continue;
      if (categoryFilter && (meta.category || "").toLowerCase() !== categoryFilter.toLowerCase()) continue;

      total++;
      categoriesCount[meta.category] = (categoriesCount[meta.category] || 0) + 1;
      citiesCount[meta.city] = (citiesCount[meta.city] || 0) + 1;
    }

    return {
      totalEvents: total,
      categories: categoriesCount,
      cities: citiesCount,
    };
  }

  getAllEvents(): EventMetadata[] {
    return Array.from(this.events.values()).map((v) => v.metadata);
  }

  /**
   * Seed the store with catalog and database events
   */
  seedFromCatalog(events: any[]): void {
    if (!Array.isArray(events)) return;
    for (const ev of events) {
      if (!this.events.has(ev.id)) {
        const struct = ev.structuredDescription || null;
        const text = struct?.rawText || `${ev.name}. Category: ${ev.category}. Location: ${ev.venue || ""}, ${ev.city}, ${ev.countryCode}. Date: ${ev.startDate}. ${ev.description || ""}`;
        this.addEvent(ev, ev.embedding || null, text);
      }
    }
    this.isSeeded = true;
  }
}

export const eventVectorStore = new EventVectorStore();
