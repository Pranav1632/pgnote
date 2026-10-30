# pgnote

> **Privacy-first, terminal-aesthetic personal note workspace** built with **Next.js 16 (React 19)**, **MongoDB**, and **Upstash Redis**.
> Features zero-stored-password mental passkey challenge-response authentication, BYOD (Bring Your Own Database) note storage isolation, and a 3-panel resizable workspace.

---

## Architecture Overview (UML & Flow)

GitHub natively renders Mermaid diagrams. Below are the comprehensive architecture diagrams detailing system components, authentication sequence, and database topology.

### 1. System Component Architecture

```mermaid
graph TD
    Client["Client Browser<br/>(React 19 / Tailwind / Radix UI)"]

    subgraph NextServer["Next.js 16 App Router (Server)"]
        Pages["Server & Client Components<br/>(/{slug}, /{slug}/notes, /public/{shareId})"]
        AuthAPI["Auth API Handlers<br/>(/api/auth/challenge, /api/auth/verify, /recovery)"]
        NoteAPI["Notes & Folders API<br/>(/api/notes, /api/folders, /share)"]
        StorageRouter["Dynamic Storage Router<br/>(lib/note-storage.ts)"]
        SessionMgr["Session Manager<br/>(iron-session sealed cookies)"]
    end

    subgraph CacheAndLimits["Upstash Redis"]
        RedisChallenges["Ephemeral Challenges<br/>(120s TTL)"]
        RateLimiter["Sliding Window Rate Limiter<br/>(IP + Slug tracking)"]
    end

    subgraph DataTier["Data Persistence"]
        CoreMongo[("Primary MongoDB<br/>(User Metadata, Algo Config, Slugs)")]
        UserMongo[("User Custom MongoDB (BYOD)<br/>(Isolated Notes & Folders)")]
    end

    Client -->|HTTPS Requests| Pages
    Pages --> AuthAPI
    Pages --> NoteAPI
    AuthAPI --> SessionMgr
    AuthAPI --> RedisChallenges
    AuthAPI --> RateLimiter
    AuthAPI --> CoreMongo
    NoteAPI --> StorageRouter
    StorageRouter -->|Default Route| CoreMongo
    StorageRouter -->|Custom URI Configured| UserMongo
```

---

### 2. Zero-Password Challenge-Response Auth Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant API as Next.js Route Handler (/api/auth)
    participant Redis as Upstash Redis (120s TTL)
    participant Mongo as Primary MongoDB (User Collection)

    Note over User,Mongo: Step 1: Challenge Generation
    User->>API: POST /api/auth/challenge { slug }
    API->>Mongo: Fetch user passkey algorithm config
    Mongo-->>API: { keyLength, chunks, order }
    API->>API: Generate random rawKey (e.g. 8 chars)
    API->>API: Apply user algo to rawKey -> challenge string
    API->>Redis: SET pgnote:challenge:{id} = { slug, rawKey } (TTL: 120s)
    API-->>User: { challengeId, challenge, keyLength }

    Note over User,Mongo: Step 2: Mental Solution & Verification
    User->>User: Mentally reverses chunk rules on challenge to recover rawKey
    User->>API: POST /api/auth/verify { slug, challengeId, responseKey }
    API->>Redis: Check rate limits & GET challenge record
    API->>API: Constant-time byte equality check: safeEqual(responseKey, rawKey)
    alt Verification Success
        API->>Redis: DEL challenge
        API->>API: Mint encrypted iron-session cookie
        API-->>User: 200 OK (Set-Cookie, Redirect to /{slug}/notes)
    else Verification Failed
        API-->>User: 401 Unauthorized / 429 Rate Limited
    end
```

---

### 3. Bring-Your-Own-Database (BYOD) Note Storage Model

```mermaid
flowchart LR
    Req["Note / Folder Request<br/>(with authenticated session)"] --> Check{"User has<br/>customMongoUri?"}
    Check -- No --> DefaultPool["Primary Mongoose Pool"]
    Check -- Yes --> ConnCache{"URI cached in<br/>customNoteStorageConnectionCache?"}
    ConnCache -- "Yes (readyState === 1)" --> CustomPool["User-Dedicated Mongoose Pool"]
    ConnCache -- "No / Stale" --> NewConn["Initialize New Pool<br/>(maxPoolSize: 5, 5s timeout)"]
    NewConn --> CustomPool
    DefaultPool --> MainDB[("App Managed MongoDB<br/>(Collections: notes, folders)")]
    CustomPool --> ExtDB[("User External MongoDB<br/>(Collections: notes, folders)")]
```

---

### 4. Data Entity Relationship (ERD)

```mermaid
erDiagram
    USER ||--o{ FOLDER : owns
    USER ||--o{ NOTE : creates
    FOLDER ||--o{ NOTE : contains

    USER {
        ObjectId _id PK
        string slug UK
        string recoveryEmail UK
        PasskeyAlgo algo "keyLength, chunks, order"
        number sessionTimeout "in minutes"
        string customMongoUri "optional BYOD URI"
        Date createdAt
        Date lastLogin
    }

    FOLDER {
        ObjectId _id PK
        ObjectId userId FK
        string name
        Date createdAt
        Date updatedAt
    }

    NOTE {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId folderId FK
        string content "up to 200k chars"
        boolean isPublic "default false"
        string shareToken "unique token for public view"
        Date createdAt
        Date updatedAt
    }
```

---

## Core Features

- **Zero-Password Mental Passkey:** No plaintext or hashed password stored. Ephemeral OTP challenge generated and solved mentally via personalized chunk transformations.
- **BYOD (Bring Your Own Database):** Users can link their personal MongoDB connection string; note data never persists in the core application database.
- **Timing-Attack Protection:** Constant-time equality validation (`safeEqual`) prevents timing attacks during challenge checks.
- **Upstash Redis Rate Limiting:** Sliding-window rate limiter (5 attempts / 15 mins for login; 3 attempts / 10 mins for recovery).
- **3-Panel Resizable Dashboard:**
  - Folders panel (collapsible, cascade delete with alert modal)
  - Full-height bash-styled editor (markdown preview, live word/char counters, Ctrl+S shortcuts)
  - Notes list panel (search, auto-title, pin, copy, share, delete)
- **Debounced Autosave:** 5-second inactivity autosave with inflight race-condition protection.
- **Public Note Sharing:** Generate public read-only URLs at `/public/{slug}.{token}`.
- **Encrypted Stateless Sessions:** Sealed cookie sessions powered by `iron-session` with automatic timeout detection and warnings.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Sonner
- **Database:** MongoDB & Mongoose 9
- **Cache / Rate Limiting:** Upstash Redis & `@upstash/ratelimit`
- **Session:** `iron-session`
- **Validation:** Zod
- **Email:** Nodemailer

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Pranav1632/pgnote.git
cd pgnote
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file based on `.env.example`:

```env
MONGODB_URI=mongodb+srv://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
SESSION_PASSWORD=at-least-32-characters-long-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## License

MIT © [Pranav](https://github.com/Pranav1632)
