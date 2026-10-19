import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { eventVectorStore } from "./vectorStore.js";
import { getCatalogEventsWithDates, getOrganizerEventById } from "./catalogEvents.js";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Format date nicely for human readability
 */
function formatEventDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr || "Date to be announced";
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr || "Date to be announced";
  }
}

/**
 * Formats full location string
 */
function formatEventLocation(event: any): string {
  const parts = [event.venue, event.address, event.city, event.stateCode, event.countryCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location to be confirmed";
}

/**
 * Generate a structured description and summary for an event upon creation.
 * Explicitly includes the event location and date in the summary and fields.
 */
export async function generateStructuredDescription(eventData: any): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const formattedDate = formatEventDate(eventData.startDate);
  const location = formatEventLocation(eventData);

  // Deterministic fallback generator
  const fallback = {
    summary: `${eventData.name} is scheduled for ${formattedDate} at ${location}. Categorized under ${eventData.category}, this event is presented by ${eventData.organizer || "the organizers"}. ${eventData.description || ""}`.trim(),
    formattedDate,
    venue: eventData.venue || "TBA",
    city: `${eventData.city}, ${eventData.countryCode}`,
    fullAddress: location,
    highlights: [
      `Theme: ${eventData.category}`,
      `Hosted at ${eventData.venue || eventData.city}`,
      `Price: ${eventData.priceRange || "paid"}`,
    ],
    targetAudience: `Enthusiasts, professionals, and attendees interested in ${eventData.category}.`,
    logistics: `Date: ${formattedDate}. Location: ${location}. Admission: ${eventData.priceRange || "paid"}.`,
    keywords: [
      eventData.category,
      eventData.city,
      eventData.organizer,
      ...(eventData.name || "").split(/\s+/),
    ].filter(Boolean),
    rawText: `Event: ${eventData.name}\nCategory: ${eventData.category}\nDate & Time: ${formattedDate}\nLocation: ${location}\nSummary: ${eventData.name} taking place on ${formattedDate} at ${location}.\nHighlights: ${eventData.category} event in ${eventData.city}\nAudience: General public and ${eventData.category} community\nPrice: ${eventData.priceRange || "paid"}`,
  };

  if (!apiKey) {
    return fallback;
  }

  try {
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: DEFAULT_MODEL,
      temperature: 0.2,
    });

    const prompt = `You are an expert event cataloger and copywriter.
Analyze the following event details and generate a comprehensive structured profile in valid JSON format.

CRITICAL REQUIREMENT:
The "summary" field MUST explicitly incorporate:
1. The exact event date and start time.
2. The full location (venue, city, and country).
3. A compelling overview of what the event is about.

Event details:
- Name: ${eventData.name}
- Category: ${eventData.category}
- Date: ${eventData.startDate} (${formattedDate})
- Venue: ${eventData.venue || "N/A"}
- Address: ${eventData.address || "N/A"}
- City: ${eventData.city}
- State: ${eventData.stateCode || "N/A"}
- Country: ${eventData.countryCode}
- Price: ${eventData.priceRange || "paid"}
- Organizer: ${eventData.organizer || "N/A"}
- Original Description: ${eventData.description || "N/A"}

Return ONLY a JSON object with this exact shape:
{
  "summary": "Rich 2-3 sentence overview EXPLICITLY mentioning date, time, and location...",
  "formattedDate": "${formattedDate}",
  "venue": "${eventData.venue || eventData.city}",
  "city": "${eventData.city}, ${eventData.countryCode}",
  "fullAddress": "${location}",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "targetAudience": "Who this event is primarily for...",
  "logistics": "Logistical details, entry information, date/time and venue access...",
  "keywords": ["tag1", "tag2", "tag3", "tag4"]
}`;

    const res = await llm.invoke(prompt);
    let text = typeof res.content === "string" ? res.content.trim() : JSON.stringify(res.content);
    
    // Clean potential markdown fences
    if (text.startsWith("```json")) text = text.slice(7);
    if (text.startsWith("```")) text = text.slice(3);
    if (text.endsWith("```")) text = text.slice(0, -3);
    text = text.trim();

    const parsed = JSON.parse(text);
    
    const rawText = [
      `Event: ${eventData.name}`,
      `Category: ${eventData.category}`,
      `Date & Time: ${parsed.formattedDate || formattedDate}`,
      `Location: ${parsed.fullAddress || location}`,
      `Summary: ${parsed.summary || fallback.summary}`,
      `Highlights: ${Array.isArray(parsed.highlights) ? parsed.highlights.join("; ") : ""}`,
      `Target Audience: ${parsed.targetAudience || ""}`,
      `Logistics: ${parsed.logistics || ""}`,
      `Keywords: ${Array.isArray(parsed.keywords) ? parsed.keywords.join(", ") : ""}`,
    ].join("\n");

    return {
      summary: parsed.summary || fallback.summary,
      formattedDate: parsed.formattedDate || formattedDate,
      venue: parsed.venue || fallback.venue,
      city: parsed.city || fallback.city,
      fullAddress: parsed.fullAddress || fallback.fullAddress,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : fallback.highlights,
      targetAudience: parsed.targetAudience || fallback.targetAudience,
      logistics: parsed.logistics || fallback.logistics,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : fallback.keywords,
      rawText,
    };
  } catch (err) {
    console.warn("AI generation failed, using fallback:", err.message);
    return fallback;
  }
}

/**
 * Generate embedding vector for an event text or user query.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !text) return null;

  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: EMBEDDING_MODEL,
    });
    return await embeddings.embedQuery(text);
  } catch (err) {
    console.warn("Embedding generation failed:", err.message);
    return null;
  }
}

/**
 * Define LangChain / LangGraph Agent Tools
 */

// Tool 1: Get information about a single specific event or project
export const getSingleEventInfoTool = tool(
  async ({ identifier }) => {
    try {
      // 1. Try vector store lookup by ID or Name
      let event = eventVectorStore.getEventById(identifier) || eventVectorStore.getEventByName(identifier);

      // 2. Try MongoDB OrganizerEvent lookup
      if (!event) {
        event = await getOrganizerEventById(identifier);
      }

      // 3. Try finding in catalog
      if (!event) {
        const catalog = await getCatalogEventsWithDates();
        event = catalog.find(
          (e) =>
            e.id === identifier ||
            e.name.toLowerCase() === identifier.toLowerCase() ||
            e.name.toLowerCase().includes(identifier.toLowerCase())
        );
      }

      if (!event) {
        return JSON.stringify({
          found: false,
          message: `No event or project found matching "${identifier}".`,
        });
      }

      const struct = event.structuredDescription || {};
      return JSON.stringify({
        found: true,
        id: event.id,
        name: event.name,
        category: event.category,
        date: struct.formattedDate || formatEventDate(event.startDate),
        location: struct.fullAddress || formatEventLocation(event),
        venue: struct.venue || event.venue,
        city: event.city,
        country: event.countryCode,
        priceRange: event.priceRange,
        organizer: event.organizer,
        summary: struct.summary || event.description,
        highlights: struct.highlights || [],
        targetAudience: struct.targetAudience || "All attendees",
        logistics: struct.logistics || `Price: ${event.priceRange}`,
        ticketUrl: event.url || null,
      });
    } catch (e) {
      return JSON.stringify({ error: `Failed to retrieve event: ${e.message}` });
    }
  },
  {
    name: "getSingleEventInfo",
    description: "Use this function to retrieve comprehensive information, date, venue, location, price, and detailed structured summary for a specific single event or project by name or ID.",
    schema: z.object({
      identifier: z.string().describe("The name, title, or ID of the single event to look up"),
    }),
  }
);

// Tool 2: Search multiple events/projects using semantic vector search & filters
export const searchMultipleEventsTool = tool(
  async ({ query, city, category, priceRange, limit = 5 }) => {
    try {
      // Generate embedding for query
      let queryEmbedding = null;
      if (query) {
        queryEmbedding = await generateEmbedding(query);
      }

      const results = await eventVectorStore.search(queryEmbedding, query, {
        city,
        category,
        priceRange,
        limit,
      });

      if (!results || results.length === 0) {
        return JSON.stringify({
          count: 0,
          events: [],
          message: `No events found matching query "${query}" with the specified filters.`,
        });
      }

      const formatted = results.map(({ event, score }) => {
        const struct = event.structuredDescription || {};
        return {
          id: event.id,
          name: event.name,
          category: event.category,
          date: struct.formattedDate || formatEventDate(event.startDate),
          location: struct.fullAddress || formatEventLocation(event),
          venue: struct.venue || event.venue,
          city: event.city,
          country: event.countryCode,
          priceRange: event.priceRange,
          organizer: event.organizer,
          summary: struct.summary || event.description,
          highlights: struct.highlights || [],
          relevanceScore: Number(score.toFixed(3)),
          ticketUrl: event.url || null,
        };
      });

      return JSON.stringify({
        count: formatted.length,
        events: formatted,
      });
    } catch (e) {
      return JSON.stringify({ error: `Search failed: ${e.message}` });
    }
  },
  {
    name: "searchMultipleEvents",
    description: "Use this function to search multiple events or projects based on topic, query description, city, category, or price range using semantic vector search.",
    schema: z.object({
      query: z.string().describe("The user's query or keywords describing what events they want to find"),
      city: z.string().optional().describe("Optional city name to filter by (e.g. 'San Francisco', 'Delhi', 'Mumbai')"),
      category: z.string().optional().describe("Optional category (Tech, Music, Sports, Food, Business, Art, Festivals, Education)"),
      priceRange: z.enum(["free", "paid", "all"]).optional().describe("Optional price filter"),
      limit: z.number().optional().default(5).describe("Maximum number of events to return"),
    }),
  }
);

// Tool 3: Get overview of available events, categories, and cities
export const listAvailableEventsOverviewTool = tool(
  async ({ city, category }) => {
    try {
      const overview = eventVectorStore.getOverview(city, category);
      return JSON.stringify(overview);
    } catch (e) {
      return JSON.stringify({ error: `Failed to get overview: ${e.message}` });
    }
  },
  {
    name: "listAvailableEventsOverview",
    description: "Use this function to get a high-level summary of total events, counts by category, and counts by city.",
    schema: z.object({
      city: z.string().optional().describe("Optional city filter"),
      category: z.string().optional().describe("Optional category filter"),
    }),
  }
);

const tools = [getSingleEventInfoTool, searchMultipleEventsTool, listAvailableEventsOverviewTool];

/**
 * Handle user chat query using LangGraph agent
 */
export async function handleAssistantChat(userMessage: string): Promise<{ eventRelated: boolean; reply: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return {
      eventRelated: false,
      reply: "AI assistant is not configured. Set GEMINI_API_KEY in server/.env",
    };
  }

  const trimmed = String(userMessage || "").trim();
  if (!trimmed) {
    return {
      eventRelated: false,
      reply: "Please provide a valid question.",
    };
  }

  const systemMessage = `You are the Event Finder AI Assistant.
You help users explore, find, and learn about events, festivals, concerts, conferences, and meetups in our catalog.

RULES:
1. If the user asks about a specific event or project by name or ID, invoke the "getSingleEventInfo" tool.
2. If the user asks about multiple events, recommendations, topics, cities, dates, or categories, invoke the "searchMultipleEvents" tool.
3. If the user asks general questions about what categories or cities are available, invoke "listAvailableEventsOverview".
4. When presenting event information to the user:
   - Always mention the event name, the date & time, and the location (venue & city).
   - Provide a concise summary or highlights.
   - Mention the price (free or paid) and ticket link if available.
5. If the user asks something completely UNRELATED to events, entertainment, cities, or our platform (for example: coding homework, general science, math equations, sports scores unrelated to events):
   - Do NOT invoke any tools.
   - Reply EXACTLY: "This query is not related to events. Please ask about concerts, festivals, venues, or our demo events."
`;

  try {
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: DEFAULT_MODEL,
      temperature: 0.2,
    });

    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: systemMessage,
    });

    const result = await agent.invoke({
      messages: [{ role: "user", content: trimmed }],
    });

    const messages = result.messages || [];
    const lastMessage = messages[messages.length - 1];
    const replyContent = typeof lastMessage?.content === "string" ? lastMessage.content : JSON.stringify(lastMessage?.content || "");

    const notRelated = replyContent.toLowerCase().includes("not related to events") ||
      replyContent.includes("This query is not related to events.");

    return {
      eventRelated: !notRelated,
      reply: replyContent,
    };
  } catch (err) {
    console.error("LangGraph agent error:", err);
    return {
      eventRelated: false,
      reply: "An error occurred while communicating with the AI agent: " + err.message,
    };
  }
}
