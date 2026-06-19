<div align="center">

# ⚔️ CP-Vertex

### A Gamified Competitive Programming Training Platform

*Train harder. Rank higher. Become unstoppable.*

[![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

</div>

---

## 🧠 What is CP-Vertex?

**CP-Vertex** is a full-stack competitive programming training platform built for serious competitive programmers. It connects directly to your **Codeforces** profile and transforms raw submission data into a rich, RPG-like experience — complete with XP, levels, duels, missions, and an AI coach that actually understands where you're weak.

Think of it as a gym tracker for CP. You train every day. CP-Vertex measures your progress, identifies your weaknesses, and keeps you coming back.

---

## ✨ Features

### 🎮 Gamification Engine
- **XP & Leveling** — Earn XP for every accepted solution. Difficulty, accuracy, and topic bonus modifiers make every solve feel meaningful.
- **Daily Missions** — A fresh set of challenges every day to build consistency.
- **Boss Fights** — Special hard problems with HP mechanics. Whittle down the boss to earn bonus XP.
- **Badges** — Unlock milestone badges for streaks, ratings, topics, and more.
- **Streak System** — Maintain daily streaks with freeze protection.

### ⚔️ Arena (1v1 Duels)
- **Matchmaking** — Challenge any CP-Vertex user to a real-time 1v1 duel.
- **Custom Problem Sets** — Duels auto-select problems near both players' average ratings.
- **Live State Machine** — Duel transitions (`pending → active → completed`) are validated server-side to prevent illegal state changes.
- **Verification** — Solve completion is verified in real-time via the Codeforces API.

### 📊 Deep Analytics
- **Topic Strength Scores** — Per-tag accuracy, recency-weighted scoring, and WA penalty analysis across 50+ CF problem tags.
- **Rating History** — Full Codeforces rating chart over time.
- **Submission Heatmap** — GitHub-style activity heatmap for solve frequency.
- **Mistake Analysis** — Tracks your most common wrong-answer patterns.

### 🤖 AI Coach
- **Personalized Insights** — Powered by Google Gemini. The AI coach reads your actual performance data and tells you exactly which topics to focus on.
- **Problem Recommendations** — Smart suggestions based on your current level and topic gaps.
- **Weekly Digest** — A weekly email summarizing your performance, streaks, and next targets.

### 🏋️ Practice Modes
- **Blitz Mode** — Timed solving sessions for speed training.
- **Arena Mode** — Pick-your-difficulty freeform practice.
- **Recovery Mode** — Drill your weakest topics with curated problem sets.
- **Virtual Contests** — Simulate past Codeforces contests from any era.

### 🏆 Social & Leaderboard
- **Global Rankings** — Compete with all CP-Vertex users by XP, rating, or streak.
- **Friend System** — Add friends, track their activity, and compare topic scores.
- **Public Profiles** — Share your CP-Vertex profile page.

### 📚 Intel Database
- **Algorithm Library** — A searchable knowledge base of CP algorithms and data structures with theory articles.
- **LaTeX Rendering** — Articles render with full mathematical notation support.
- **Practice Problem Links** — Each topic links directly to curated Codeforces problem sets.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CP-Vertex                            │
│                                                             │
│  ┌────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Next.js  │    │   Service   │    │   Data Layer    │  │
│  │  App Router│───▶│    Layer    │───▶│  Prisma + Neon  │  │
│  │  (API +    │    │  (Business  │    │  PostgreSQL      │  │
│  │  Frontend) │    │   Logic)    │    │                 │  │
│  └────────────┘    └─────────────┘    └─────────────────┘  │
│         │                                       │           │
│  ┌──────▼──────┐    ┌───────────────┐    ┌─────▼───────┐   │
│  │   Zustand   │    │  BullMQ Jobs  │    │  Upstash    │   │
│  │   Stores    │    │  (CF Sync,    │    │  Redis Cache│   │
│  │  (UI State) │    │  Digests, AI) │    │  + Rate Lmt │   │
│  └─────────────┘    └───────────────┘    └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **App Router** — Next.js 16 App Router for server components and co-located API routes.
- **Repository Pattern** — `IUserRepo` / `IProblemRepo` interfaces decouple business logic from Prisma.
- **Decorator Pattern** — `withAuth()` higher-order function centralizes auth across all routes.
- **State Machine** — `duelStateMachine.ts` validates all duel state transitions server-side.
- **Circuit Breaker** — Protects the system from Codeforces API outages (3 failures → 60s cooldown).
- **Command Pattern** — `AwardXPCommand` / `GrantBadgeCommand` encapsulate side effects.
- **Redis Caching** — CF API responses are cached with stale-fallback to survive API downtime.
- **BullMQ Workers** — Background jobs for CF sync, AI insight generation, and weekly digests.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL (Neon) via Prisma 7 |
| **Cache & Queue** | Upstash Redis + BullMQ |
| **Auth** | NextAuth v5 (Google + GitHub OAuth) |
| **Realtime** | Supabase Broadcast |
| **AI** | Google Gemini (`@google/generative-ai`) |
| **Email** | Resend |
| **Animations** | GSAP, Anime.js, Motion (Framer), Lenis, Three.js |
| **Charts** | Recharts |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand |
| **Error Tracking** | Sentry |
| **Analytics** | Vercel Analytics |
| **Testing** | Vitest |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (Neon recommended for serverless)
- **Redis** instance (Upstash recommended)
- **Codeforces** account (for profile sync)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/cp-vertex.git
cd cp-vertex
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Your app's base URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console OAuth credentials |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console OAuth credentials |
| `GITHUB_ID` | From your GitHub OAuth App |
| `GITHUB_SECRET` | From your GitHub OAuth App |
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct PostgreSQL URL (for Prisma migrations) |
| `SUPABASE_URL` | Supabase project URL (for realtime) |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `UPSTASH_REDIS_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_TOKEN` | Upstash Redis REST token |
| `BULLMQ_REDIS_URL` | Redis connection string for BullMQ |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `RESEND_FROM` | Sender email address |
| `CRON_SECRET` | Random secret to protect cron endpoints |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking |
| `GEMINI_API_KEY` | Google Gemini API key for AI coach |

### 4. Set Up the Database

```bash
# Generate and apply migrations
npx prisma migrate dev

# (Optional) Seed algorithm library
npm run import:algorithms
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with Google or GitHub.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                  # All backend API routes
│   │   ├── analytics/        #   Performance analytics
│   │   ├── auth/             #   NextAuth authentication
│   │   ├── badges/           #   Badge system
│   │   ├── coach/            #   AI coaching insights
│   │   ├── cron/             #   Scheduled jobs
│   │   ├── duels/            #   1v1 matchmaking & combat
│   │   ├── health/           #   Health check endpoint
│   │   ├── leaderboard/      #   Global rankings
│   │   ├── missions/         #   Daily missions
│   │   ├── problems/         #   Problem database
│   │   └── user/             #   User management & CF sync
│   │
│   ├── arena/                # Duel hub & live combat pages
│   ├── dashboard/            # Main dashboard
│   ├── learn/                # Intel database & algorithm library
│   ├── practice/             # Training modes
│   ├── problems/             # Full problem arsenal
│   └── profile/[handle]/     # Public user profile
│
├── services/                 # Business logic layer
│   ├── duel.service.ts
│   ├── problem.service.ts
│   └── user.service.ts
│
├── repositories/             # Dependency injection / DB interfaces
│   ├── IUserRepo.ts
│   ├── PrismaUserRepo.ts
│   ├── IProblemRepo.ts
│   └── PrismaProblemRepo.ts
│
├── lib/                      # Shared utilities
│   ├── cf-api.ts             # Codeforces API client (Redis cached)
│   ├── circuitBreaker.ts     # CF API circuit breaker
│   ├── duelStateMachine.ts   # Duel state transition validation
│   ├── withAuth.ts           # Route auth decorator
│   ├── xp-math.ts            # XP & leveling formulas
│   ├── strength.ts           # Topic strength scoring
│   └── ratelimit.ts          # Per-route rate limiting
│
├── commands/                 # Command pattern for side effects
│   ├── AwardXPCommand.ts
│   └── GrantBadgeCommand.ts
│
├── workers/                  # BullMQ background jobs
│   ├── cf-sync.ts
│   ├── coach-insights.ts
│   ├── strength-scores.ts
│   └── weekly-digest.ts
│
├── store/                    # Zustand state slices
│   ├── useUserStore.ts
│   ├── useMissionStore.ts
│   └── useUIStore.ts
│
└── __tests__/                # Vitest test suites
    ├── xp-math.test.ts
    └── strength.test.ts
```

---

## 🧪 Testing

```bash
# Run all tests
npx vitest run

# Run tests in watch mode
npx vitest
```

Tests cover core business logic including XP calculation, topic strength scoring, and duel state machine transitions.

---

## 🔁 CI/CD

The project uses GitHub Actions for automated quality checks on every push and pull request to `main`:

1. **Type Check** — `tsc --noEmit`
2. **Lint** — `eslint src/`
3. **Test** — `vitest run`
4. **Deploy** — Vercel (on `main` branch only)

---

## ⚡ Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (DB + Redis) |
| `GET` | `/api/user/me` | Get current authenticated user |
| `POST` | `/api/user/cf-handle` | Link Codeforces handle |
| `POST` | `/api/user/sync` | Trigger Codeforces sync |
| `GET` | `/api/duels` | List active/pending duels |
| `POST` | `/api/duels` | Create a new duel challenge |
| `POST` | `/api/duels/[id]/accept` | Accept a duel |
| `POST` | `/api/duels/[id]/verify` | Verify problem completion |
| `GET` | `/api/leaderboard` | Global rankings |
| `GET` | `/api/coach/insights` | Get AI coach recommendations |
| `GET` | `/api/analytics/scores` | Topic strength scores |
| `GET` | `/api/missions/today` | Today's daily missions |

---

## 🤝 Contributing

Contributions are welcome! Please open an issue to discuss what you'd like to change before submitting a pull request.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ for competitive programmers who want to level up.

**[Live Demo](https://cp-vertex.vercel.app)** · **[Report Bug](https://github.com/your-username/cp-vertex/issues)** · **[Request Feature](https://github.com/your-username/cp-vertex/issues)**

</div>
