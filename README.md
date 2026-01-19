# Grant Radar SG 🇸🇬

**Grant Radar SG** is an AI-powered platform designed to help Singaporean Non-Profit Organizations (NPOs) and SMEs automatically discover, match, and apply for relevant government grants.

Instead of manually searching through hundreds of schemes, users create an organization profile, and our AI agents continuously scan and alert them to opportunities that match their specific mission, KPIs, and funding needs.

## 🚀 Features

-   **AI Semantic Search**: Find grants using natural language (e.g., "funding for elderly digitalization projects") rather than keyword matching.
-   **Smart Matching**: Automatically matches your organization's profile (sector, size, mission) against grant eligibility criteria.
-   **Real-time Streaming**: Search results are streamed in real-time as AI agents evaluate each grant.
-   **Organization Profiles**: persistent profiles that allow for "passive" grant hunting.
-   **Automated Ingestion**: A dedicated engine that scrapes and indexes grant information from official sources.

## 🛠️ Technology Stack

### Frontend
-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS & [shadcn/ui](https://ui.shadcn.com/)
-   **Auth**: Firebase Authentication
-   **State**: React Context (AuthProvider)

### Backend API
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
-   **Database**: PostgreSQL with `pgvector` (via Google AlloyDB / Local Docker)
-   **ORM**: SQLModel
-   **AI/LLM**: Google Gemini Pro (via LangChain)
-   **Models**: Pydantic for schema validation

### Ingestion Engine
-   **Purpose**: Scrapes grant portals and processes PDF/HTML guidelines into vector embeddings.
-   **Tools**: BeautifulSoup4, PyPDF2, Google Gemini (for unstructured text processing).

## 🏁 Getting Started

### Prerequisites
-   [Docker Desktop](https://www.docker.com/)
-   [Node.js 18+](https://nodejs.org/)
-   [Conda](https://docs.conda.io/en/latest/) (Optional, for local Python dev)
-   Google Cloud Platform Account (Active Project with Vertex AI enabled)
-   Firebase Project

### 1. Environment Setup

#### Frontend
Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend
The backend relies on Google Cloud credentials. Place your service account JSON or use `gcloud auth application-default login`.

### 2. Running with Docker (Recommended for Backend)

The backend and database are best run via Docker Compose to ensure all dependencies (like `pgvector`) are present.

```bash
cd api
docker compose up --build
```
This will start:
-   **FastAPI Service** on `http://localhost:8000`
-   **PostgreSQL DB** (if configured logically in compose, or it connects to Cloud AlloyDB)

### 3. Running Frontend Locally

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## 📂 Project Structure

```
grant-radar-sg/
├── api/
│   ├── grant-query/          # Main FastAPI Service
│   │   ├── api.py            # Entry point
│   │   ├── models.py         # Database Models
│   │   ├── schemas.py        # Pydantic Schemas
│   │   └── environment.yml   # Conda Dependencies
│   └── ingestion-engine/     # Scraper & Indexer
│       └── main.py
├── frontend/                 # Next.js Application
│   ├── app/                  # App Router Pages
│   ├── components/           # UI Components
│   └── lib/                  # Utilities (Firebase, API client)
└── README.md
```

## 🧠 AI & Search Logic

1.  **Ingestion**: Grants are scraped and chunks of text are embedded using user Google's `text-embedding-004`.
2.  **Vector Search**: User queries/profiles are embedded and compared against grant vectors using cosine similarity (in PostgreSQL via `pgvector`).
3.  **Reranking/Evaluation**: Top candidate grants are sent to Gemini Pro with the user's specific context to generate a qualitative "Relevance Score" and explanation.

## 📄 License
[MIT](LICENSE)
