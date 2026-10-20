# Event Finder

A full-stack, AI-powered application to discover and manage events near you or across global destinations. Built with **TypeScript**, **React 18 (TSX)**, **Node.js / Express (TypeScript)**, **PostgreSQL** with **Prisma ORM** and **`pgvector`**, and an autonomous **LangChain / LangGraph** ReAct agent powered by Google Gemini.

---

## Key Features

### 1. AI Assistant & Vector Search (LangChain + LangGraph + `pgvector`)
- **Structured Description Generation**: When an event is created or ingested, the system extracts a structured representation containing dates, venue, city, logistical details, keywords, and audience info.
- **768-Dimensional Vector Embeddings**: Ingests event descriptions into vector embeddings using Google Generative AI embeddings (`text-embedding-004`).
- **PostgreSQL Vector DB (`pgvector`)**: Stores and queries high-dimensional embeddings directly in PostgreSQL using native vector distance queries (`<=>` cosine similarity).
- **LangGraph ReAct Agent**: Dynamic multi-tool reasoning loop that inspects user queries, determines relevance, and calls specialized tools:
  - `getSingleEventInfo`: Retrieves detailed schedule, venue, and ticketing about a specific event.
  - `searchMultipleEvents`: Performs structured and semantic searches across events by keyword, city, category, date, or price.
  - `listAvailableEventsOverview`: Provides high-level summaries of upcoming events across catalog categories.
- **Response Synthesis**: Synthesizes retrieved event data into an intuitive conversational response.

### 2. Event Discovery & Geospatial Exploration
- **Flexible Location Modes**: Automatic browser GPS, IP-based approximate fallback ([ip-api.com](http://ip-api.com)), or manual city & country browsing (with 60+ sample cities across countries including India, US, UK, etc.).
- **Interactive Road Routes (OSRM + Leaflet)**: Interactive map with road driving directions, live distance (km), and travel time estimates calculated from your location to any selected event.
- **Interests & Smart Recommendations**: Filter by Tech, Music, Sports, Food, Business, Art, Festivals, and Education. Logged-in users receive behavior-weighted recommendations based on past views and saved interests.
- **Trending & "Surprise Me"**: Real-time trending events per region and random discovery generator.
- **Calendar Integration**: One-click Google Calendar addition and `.ics` calendar file downloads.

### 3. Organizer Portal
- Dedicated organizer role registration and authentication.
- Publish custom events with complete metadata (venue, location coordinates, category, price, ticket URL).
- Automatic vector embedding generation and PostgreSQL storage upon event creation.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript (`.tsx`), Vite, Tailwind CSS, Framer Motion, Leaflet / React-Leaflet |
| **Backend** | Node.js, Express, TypeScript (`.ts`), `tsx` |
| **Database & ORM** | PostgreSQL 16, `pgvector` extension, Prisma ORM v5 |
| **AI / Vector Store** | LangChain (`@langchain/core`), LangGraph (`@langchain/langgraph`), Google Gemini (`@google/genai`), PostgreSQL Vector Store |
| **External APIs** | OpenStreetMap (OSM) Tiles, OSRM Directions, Ticketmaster Discovery API (optional fallback) |

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **Docker** & **Docker Compose** (recommended for running PostgreSQL with `pgvector`), or a local PostgreSQL instance with `pgvector` enabled.

---

## Setup & Installation

### 1. Clone & Install Dependencies

From the project root:

```bash
# Install root, server, and client dependencies
npm install
npm run install:all
```

### 2. Start PostgreSQL with `pgvector`

Use the provided Docker Compose configuration:

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container with `pgvector` pre-installed on port `5432` (`postgres:postgres@localhost:5432/eventfinder`).

### 3. Configure Server Environment

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

Adjust variables as needed:

```env
PORT=5050
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventfinder?schema=public"
JWT_SECRET="your-super-secret-jwt-key"

# AI Assistant & Embeddings (Google AI Studio)
GEMINI_API_KEY="your-gemini-api-key"

# Optional External Data
TICKETMASTER_API_KEY=""
USE_SAMPLE_EVENTS=true

CLIENT_ORIGIN="http://localhost:5173"
```

### 4. Push Prisma Schema & Generate Client

Initialize the database schema and pgvector extension:

```bash
cd server
npx prisma db push
npx prisma generate
cd ..
```

---

## Running Locally

### Option A: Run Everything Concurrently

From the root directory:

```bash
npm run dev
```

### Option B: Run in Separate Terminals

- **Terminal 1 (Backend API)**:
  ```bash
  cd server && npm run dev
  ```
- **Terminal 2 (Frontend Client)**:
  ```bash
  cd client && npm run dev
  ```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **API Health**: [http://localhost:5050/api/health](http://localhost:5050/api/health)

> [!NOTE]
> Default server port is **5050** to avoid conflicts with macOS AirPlay on port 5000. If changed, ensure `client/vite.config.ts` proxy target matches `PORT`.

---

## Production Build & Type Checking

To verify TypeScript types across both server and client:

```bash
# Server typecheck
npm run typecheck --prefix server

# Client typecheck & build
npm run typecheck --prefix client
npm run build --prefix client
```

To run the production server:

```bash
npm run start --prefix server
```

---

## API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/events/search` | Search events by query, coordinates (`lat`, `lng`), radius, category, date, price, city, country |
| **GET** | `/api/events/:id` | Get event details by ID and record engagement metrics |
| **GET** | `/api/events/trending` | List trending events ranked by views and popularity |
| **GET** | `/api/events/recommendations` | Get personalized event recommendations based on user interests |
| **GET** | `/api/events/cities` | List available cities with sample events for a country |
| **GET** | `/api/events/nearest-city` | Find nearest supported demo city from GPS coordinates |
| **GET** | `/api/events/directions` | Fetch driving polyline coordinates, distance, and duration via OSRM |
| **POST** | `/api/assistant/chat` | AI Assistant: LangGraph ReAct agent reasoning with catalog tools & vector search |
| **POST** | `/api/auth/register` | Register an attendee user account |
| **POST** | `/api/auth/login` | Authenticate attendee or organizer and receive JWT |
| **GET** | `/api/auth/me` | Retrieve authenticated user profile |
| **PATCH** | `/api/user/interests` | Update user event interests |
| **GET/POST/DELETE** | `/api/user/favorites` | Manage user favorite events |
| **POST** | `/api/organizer/register` | Register an organizer account |
| **POST** | `/api/organizer/events` | Create a new organizer event (generates vector embedding & saves to DB) |

---

## Project Structure

```
cursor-ai-based-application/
├── docker-compose.yml              # PostgreSQL + pgvector container definition
├── package.json                    # Workspace orchestration scripts
├── server/
│   ├── prisma/
│   │   └── schema.prisma           # Prisma schema with pgvector extension & models
│   ├── src/
│   │   ├── config/db.ts            # Prisma client connection and vector check
│   │   ├── data/                   # Global & India sample event catalogs
│   │   ├── middleware/             # JWT authentication & organizer guard
│   │   ├── routes/                 # Express REST endpoints (events, assistant, auth, etc.)
│   │   ├── services/
│   │   │   ├── aiAgent.ts          # LangChain/LangGraph agent, tools & prompt synthesis
│   │   │   ├── vectorStore.ts      # Native pgvector similarity search & fallback
│   │   │   ├── catalogEvents.ts    # Hybrid event repository (DB + catalog)
│   │   │   ├── ipGeolocation.ts    # IP-based geolocation fallback
│   │   │   └── ticketmaster.ts     # Ticketmaster Discovery API integration
│   │   ├── types/                  # TypeScript declaration files
│   │   ├── env.ts                  # Validated environment configuration
│   │   └── index.ts                # Application entry point
│   └── tsconfig.json               # Server TypeScript configuration
└── client/
    ├── src/
    │   ├── api/client.ts           # Typed API client
    │   ├── components/             # EventCard, EventsMap, Layout (TSX)
    │   ├── context/                # AuthContext, ThemeContext (TSX)
    │   ├── lib/utils.ts            # Helpers, date formatting, ICS generator
    │   ├── pages/                  # HomePage, AssistantPage, EventDetailPage, etc.
    │   ├── types/                  # Client domain TypeScript interfaces
    │   ├── App.tsx                 # Root application routes
    │   └── main.tsx                # React DOM entry point
    ├── index.html                  # HTML template
    ├── tailwind.config.ts          # Tailwind CSS TypeScript configuration
    ├── vite.config.ts              # Vite configuration with API proxy
    └── tsconfig.json               # Client TypeScript configuration
```

---

## License

MIT
