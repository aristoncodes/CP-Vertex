# CP Vertex — Project Architecture

## Directory Structure

```
cp-vertex/
├── prisma/
│   └── schema.prisma           # Database schema (PostgreSQL)
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   │
│   │   ├── api/                # ═══ BACKEND (API Routes) ═══
│   │   │   ├── analytics/      #   Performance analytics
│   │   │   ├── auth/           #   NextAuth authentication
│   │   │   ├── badges/         #   Badge system
│   │   │   ├── coach/          #   AI coaching insights
│   │   │   ├── cron/           #   Scheduled jobs (CF sync, weekly digest)
│   │   │   ├── duels/          #   1v1 matchmaking & combat
│   │   │   ├── journal/        #   User journal entries
│   │   │   ├── leaderboard/    #   Global rankings
│   │   │   ├── missions/       #   Daily missions & boss fights
│   │   │   ├── postmortems/    #   Submission reviews
│   │   │   ├── problems/       #   Problem database (import, pick, filter)
│   │   │   ├── roadmap/        #   Learning roadmap
│   │   │   ├── user/           #   User CRUD, CF sync, search, reset
│   │   │   ├── weekly-review/  #   Weekly performance review
│   │   │   └── xp/             #   XP history
│   │   │
│   │   ├── arena/              # ═══ FRONTEND (Pages) ═══
│   │   │   ├── boss/           #   Boss fight challenge page
│   │   │   ├── contest/        #   Contest simulation page
│   │   │   ├── duel/[id]/      #   Live duel combat screen
│   │   │   ├── matchmaking/    #   1v1 opponent search & history
│   │   │   └── page.tsx        #   Arena hub
│   │   │
│   │   ├── dashboard/          #   Main dashboard
│   │   ├── leaderboard/        #   Rankings page
│   │   ├── learn/              #   Learning resources
│   │   ├── practice/           #   Training modes (Blitz/Arena/Recovery)
│   │   │   └── session/        #   Active training session
│   │   ├── problems/           #   Arsenal — full problem database
│   │   ├── profile/[handle]/   #   Public user profile
│   │   ├── settings/           #   User settings & preferences
│   │   ├── layout.tsx          #   Root layout
│   │   └── page.tsx            #   Landing page
│   │
│   ├── services/               # ═══ BUSINESS LOGIC ═══
│   │   ├── duel.service.ts     #   Duel creation, acceptance, verification
│   │   ├── problem.service.ts  #   Problem import, pick-for-me, status
│   │   └── user.service.ts     #   User sync, search, account reset
│   │
│   ├── lib/                    # ═══ SHARED UTILITIES ═══
│   │   ├── cf-api.ts           #   Codeforces API client (cached via Redis)
│   │   ├── coach.ts            #   AI coach logic
│   │   ├── difficulty.ts       #   Difficulty calculation
│   │   ├── prisma.ts           #   Prisma client singleton
│   │   ├── ratelimit.ts        #   API rate limiting
│   │   ├── realtime.ts         #   Real-time event helpers
│   │   ├── redis.ts            #   Redis client singleton
│   │   ├── strength.ts         #   User strength/rating calculation
│   │   └── xp.ts               #   XP calculation formulas
│   │
│   ├── components/             # ═══ FRONTEND COMPONENTS ═══
│   │   ├── landing/            #   Landing page (ParticleStorm)
│   │   ├── layout/             #   Shared layout (TopBar, Sidebar, DashboardLayout)
│   │   └── ui/                 #   Reusable UI (Heatmap, XPBar, MissionCard, etc.)
│   │
│   ├── hooks/                  # ═══ REACT HOOKS ═══
│   │   ├── useCursorTilt.ts    #   3D tilt effect
│   │   ├── useRealtime.ts      #   Real-time updates
│   │   ├── useScrollProgress.ts#   Scroll progress tracking
│   │   └── useTypewriter.ts    #   Typewriter text animation
│   │
│   ├── workers/                # ═══ BACKGROUND JOBS ═══
│   │   ├── cf-sync.ts          #   Codeforces submission sync worker
│   │   ├── coach-insights.ts   #   AI coach insight generation
│   │   ├── strength-scores.ts  #   Topic strength recalculation
│   │   └── weekly-digest.ts    #   Weekly email/digest generation
│   │
│   ├── providers/              #   React context providers
│   ├── store/                  #   Global state (Zustand)
│   ├── types/                  #   TypeScript type definitions
│   ├── data/                   #   Static data & mock data
│   ├── scripts/                #   One-off scripts (seed, migrate)
│   ├── generated/              #   Auto-generated (Prisma client)
│   ├── auth.ts                 #   NextAuth configuration
│   └── middleware.ts           #   Edge middleware (auth checks)
│
├── public/                     # Static assets
└── package.json
```

## Data Flow

```
Frontend Page  →  fetch("/api/...")  →  API Route  →  Service Layer  →  Prisma/DB
     ↑                                     ↓
     └─────────────── JSON Response ───────┘
```

## Key Conventions

1. **API routes** (`src/app/api/`) handle HTTP concerns only: auth, validation, response formatting
2. **Services** (`src/services/`) contain all business logic and database operations
3. **Lib** (`src/lib/`) contains stateless utilities shared by both frontend and backend
4. **Components** (`src/components/`) are purely presentational React components
5. **Workers** (`src/workers/`) run as background jobs triggered by cron endpoints
