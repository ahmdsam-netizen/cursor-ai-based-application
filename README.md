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

## Quick Start (Run with Docker in One Command) 🚀

You can spin up the full application (**PostgreSQL with pgvector**, **Node.js Express backend**, and **React frontend**) with a single command:

```bash
# 1. (Optional) Copy environment template and add your GEMINI_API_KEY
cp .env.example .env

# 2. Build and start all services in one command
docker compose up --build
```

That's it! Once started:
- 🌐 **Web App (Frontend)**: [http://localhost:5173](http://localhost:5173)
- 🔌 **API Server**: [http://localhost:5050](http://localhost:5050)
- 🩺 **API Health Check**: [http://localhost:5050/api/health](http://localhost:5050/api/health)
- 🗄️ **PostgreSQL (pgvector)**: `localhost:5432` (db: `event_finder`, user: `postgres`, password: `postgrespassword`)

To stop all services:
```bash
docker compose down
```

---

## Local Development (Without Full Docker)

If you prefer running the code locally with Vite hot-reloading:

### 1. Install Dependencies

From the project root:

```bash
npm install
npm run install:all
```

### 2. Start PostgreSQL with `pgvector`

Use Docker Compose to run only the database:

```bash
docker compose up -d postgres
```

### 3. Configure Server Environment

Copy `server/.env.example` to `server/.env`:

```bash
cp server/.env.example server/.env
```

Adjust variables as needed (e.g., adding `GEMINI_API_KEY` for AI assistant capabilities).

### 4. Push Prisma Schema & Generate Client

```bash
cd server
npx prisma db push
npx prisma generate
cd ..
```

### 5. Start Frontend and Backend Concurrently

From the root directory:

```bash
npm run dev
```

- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5050/api/health](http://localhost:5050/api/health)

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
├── docker-compose.yml              # Multi-container orchestration (PostgreSQL + Server + Client)
├── Dockerfile                      # Standalone full-stack multi-stage Docker build
├── .env.example                    # Global environment template for Docker Compose
├── package.json                    # Workspace orchestration scripts
├── server/
│   ├── Dockerfile                  # Node.js backend Docker container
│   ├── docker-entrypoint.sh        # Automated Prisma push and startup script
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
│   │   └── index.ts                # Application entry point & static SPA fallback
│   └── tsconfig.json               # Server TypeScript configuration
└── client/
    ├── Dockerfile                  # Frontend Vite build + Nginx container
    ├── nginx.conf                  # Nginx reverse proxy configuration
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
