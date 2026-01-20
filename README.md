# Grant Radar SG 🇸🇬

**Grant Radar SG** is an AI-powered platform designed to help Singaporean Non-Profit Organizations (NPOs) and SMEs automatically discover, match, and apply for relevant government grants.

Instead of manually searching through hundreds of schemes, users create an organization profile, and our AI agents continuously scan and alert them to opportunities that match their specific mission, KPIs, and funding needs.

## 🚀 Features

-   **AI Semantic Search**: Find grants using natural language (e.g., "funding for elderly digitalization projects") rather than keyword matching.
-   **Smart Matching**: Automatically matches your organization's profile (sector, size, mission) against grant eligibility criteria.
-   **Real-time Streaming**: Search results are streamed in real-time as AI agents evaluate each grant.
-   **Organization Profiles**: persistent profiles that allow for "passive" grant hunting.
-   **Automated Ingestion**: A dedicated engine that scrapes and indexes grant information from official sources, with automated routing depending on context

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
-   **AI/LLM**: Google Gemini (via LangChain)
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

## 🔥 Firebase Setup

### 1. Create Project
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project (or use an existing GCP project).

### 2. Enable Authentication
1.  Navigate to **Build** > **Authentication**.
2.  Click **Get Started**.
3.  On the **Sign-in method** tab, enable **Google**.
4.  Configure the support email and save.

### 3. Get Frontend Config
1.  Go to **Project Settings** (gear icon).
2.  Under **Your apps**, click the web icon (`</>`) to register a web app.
3.  Copy the `firebaseConfig` object values.
4.  Populate your `frontend/.env.local` file (as shown in [Environment Setup](#1-environment-setup)).

### 4. Backend Verification
The backend uses `firebase-admin` to verify tokens.
-   **Production**: It automatically uses the GCP project's default credentials (ADC).
-   **Local**: Ensure your `GOOGLE_CLOUD_PROJECT` environment variable matches your Firebase project ID.

---

## 🧠 AI & Search Logic

1.  **Ingestion**: Grants are scraped and chunks of text are embedded using user Google's `text-embedding-004`.
2.  **Vector Search**: User queries/profiles are embedded and compared against grant vectors using cosine similarity (in PostgreSQL via `pgvector`).
3.  **Reranking/Evaluation**: Top candidate grants are sent to Gemini Pro with the user's specific context to generate a qualitative "Relevance Score" and explanation.

## ⚙️ Ingestion Engine (Firebase Functions)

The ingestion engine is a Cloud Function that scrapes government portals (specifically `oursggrants.gov.sg`) to keep the database up-to-date.

### Deployment 
The function is located in `api/ingestion-engine` and deployed via Firebase CLI.

```bash
# Login to Firebase
firebase login

# Deploy only the functions
firebase deploy --only functions
```

### Architecture
-   **Trigger**:
    -   **Scheduled**: Runs automatically everyday at 8:00 AM SGT via `scheduler_fn`.
    -   **HTTP**: Can be manually triggered via HTTP request for testing/on-demand updates.
-   **Logic**:
    1.  Fetches latest grant metadata from source API.
    2.  Compares against existing database records.
    3.  **Fast Path**: strict status updates (Open/Closed) for existing grants.
    4.  **Slow Path**: New grants are fully ingested, processed by Gemini for metadata (strategies, intent), and embedded into `pgvector`.
    5.  **Notification**: Triggers email alerts for relevant subscribers.

---

## 📧 Email Notifications Setup

We use [Resend](https://resend.com) to deliver transactional emails (Grant Alerts).

### Configuration
1.  Get an API Key from Resend.
2.  Verify a sending domain (e.g., `grantradarsg2026.site`).
3.  Add the key to your environment variables (`Dockerfile`, `docker-compose.yml`, and `.env`):

```bash
RESEND_API_KEY=re_123456789...
```

### Usage in Code
The email logic is encapsulated in `email_service.py`:
-   **`send_grant_notification`**: Generates a personalized HTML email listing new matching grants.
-   **Template**: Includes grant details (Agency, Funding Amout, Strategy) and a direct link to apply.


## ☁️ AlloyDB Setup (Production Database)

The application uses **Google Cloud AlloyDB for PostgreSQL** for vector storage (`pgvector`) and high-performance querying.

### 1. Enable APIs
Ensure the following APIs are enabled in your GCP project:
-   AlloyDB API
-   Compute Engine API
-   Service Networking API

### 2. Create Cluster & Instance
1.  Go to the AlloyDB console.
2.  Create a Cluster (e.g., `grants-cluster`) in `asia-southeast1`.
3.  Create a Primary Instance (e.g., `grants-instance`).
4.  **Important**: Set a password for the `postgres` user.

### 3. Configure Database
You must enable `pgvector` on the instance. Connect via Cloud Shell or a VM in the same VPC:
```sql
CREATE EXTENSION vector;
```
*(Note: The application attempts to run this on startup, but it's safer to ensure it manually).*

### 4. Application Configuration
Set the following environment variables in `.env` or Docker:

```bash
ALLOYDB_REGION=asia-southeast1
ALLOYDB_CLUSTER=grants-cluster
ALLOYDB_INSTANCE=grants-instance
ALLOYDB_DB_USER=postgres
ALLOYDB_DB_PASS=your-secure-password
ALLOYDB_DB_NAME=postgres  # or your custom DB name
```

### 5. Authentication
The application uses the **AlloyDB Python Connector**, which requires IAM authentication.
-   **Local**: `gcloud auth application-default login`
-   **Production (Cloud Run)**: Ensure the service account has the **AlloyDB Client** role.

---

## 📄 License
[MIT](LICENSE)
