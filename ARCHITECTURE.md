# CP Vertex Architecture

## Overview

CP Vertex is a competitive programming training platform built with Next.js 15, Prisma ORM, and Codeforces API integration. It provides structured training, PvP duels, AI coaching, and a comprehensive algorithm library.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: Vanilla CSS with CSS custom properties (dark/light themes)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (GitHub + Credentials)
- **AI**: Google Gemini API (coaching insights, post-mortem analysis)
- **External API**: Codeforces API (ratings, submissions, problems)

## Navigation Model (5 Top-Level Items)

| Route        | Purpose                                         |
| ------------ | ----------------------------------------------- |
| `/dashboard` | Central hub — stats, streaks, missions, XP      |
| `/train`     | All solo practice — modes, problem browser, upsolve |
| `/compete`   | PvP duels, matchmaking, leaderboard             |
| `/learn`     | Algorithmic Library (CP-Algorithms reference)   |
| `/profile`   | User profile, settings, badges                  |

### Additional Routes

| Route        | Purpose                    |
| ------------ | -------------------------- |
| `/contests`  | Virtual contest simulation |
| `/friends`   | Social / friend list       |
| `/upsolve`   | Upsolve tracker (deep link)|
| `/onboarding`| First-time setup wizard    |

### Deprecated Routes (redirects in place)

| Old Route      | Redirects To              |
| -------------- | ------------------------- |
| `/practice`    | `/train`                  |
| `/problems`    | `/train?tab=problems`     |
| `/arena`       | `/compete`                |
| `/leaderboard` | `/compete?tab=leaderboard`|

## Directory Structure

```
src/
├── app/
│   ├── (app)/              # Route group (unused wrapper)
│   ├── api/                # API routes
│   │   ├── cron/           # Scheduled tasks (sync, daily missions)
│   │   ├── duels/          # Duel CRUD + matchmaking
│   │   ├── intel/          # Algorithm article endpoints
│   │   ├── leaderboard/    # Leaderboard data
│   │   ├── missions/       # Daily mission system
│   │   ├── problems/       # Problem CRUD, pick, verify, arena, boss, blitz
│   │   └── user/           # User profile, CF handle, sync, search
│   ├── arena/              # [REDIRECT → /compete] Boss fight still lives here
│   ├── compete/            # PvP hub: duels, matchmaking, leaderboard
│   ├── contests/           # Virtual contest simulation
│   ├── dashboard/          # Main dashboard
│   ├── friends/            # Social features
│   ├── learn/              # Algorithmic Library
│   │   └── [...slug]/      # Individual article pages
│   ├── login/              # Authentication
│   ├── onboarding/         # First-time user setup
│   ├── practice/           # [REDIRECT → /train]
│   ├── problems/           # [REDIRECT → /train?tab=problems]
│   ├── leaderboard/        # [REDIRECT → /compete]
│   ├── profile/            # User profile
│   ├── settings/           # User settings
│   ├── train/              # Unified training hub
│   │   └── session/        # Active training session (blitz, drill, warmup, boss)
│   └── upsolve/            # Upsolve tracker
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── ui/                 # Reusable UI components
│       ├── AISummaryCard.tsx
│       ├── CoachInsightCard.tsx
│       ├── CommandPalette.tsx
│       ├── HintButton.tsx
│       ├── LinkCFPrompt.tsx
│       ├── MissionCard.tsx
│       ├── MissionMap.tsx
│       ├── PostMortemModal.tsx
│       ├── ThemeToggle.tsx
│       └── ToastProvider.tsx
├── generated/prisma/       # Prisma generated client
├── lib/                    # Shared utilities
│   ├── auth.ts
│   ├── prisma.ts
│   ├── upsolve.ts
│   └── xp.ts
├── scripts/                # Data seeding scripts
├── services/               # Business logic services
│   ├── problem.service.ts
│   └── user.service.ts
├── store/                  # Zustand state management
│   └── useStore.ts
└── workers/                # Background sync workers
    └── cf-sync.ts
```

## Training Modes

| Mode    | Query Param        | Description                        | API Endpoint          |
| ------- | ------------------ | ---------------------------------- | --------------------- |
| Blitz   | `?mode=blitz`      | 3-5 quick comfort-zone problems    | `/api/problems/blitz` |
| Drill   | `?mode=drill`      | 5-8 weakness-targeting problems    | `/api/problems/arena` |
| Warmup  | `?mode=warmup`     | 2-3 rating-level problems          | `/api/problems/recovery` |
| Boss    | `?mode=boss`       | 1 problem 300-500 above rating     | `/api/problems/boss`  |

> **Note**: "Drill" was previously called "Arena Mode" in the solo practice context. Renamed to avoid collision with the PvP Arena (now "Compete"). The API endpoint `/api/problems/arena` is unchanged for backward compatibility.

## Key Design Decisions

1. **Unified Train Hub**: Problems + Practice + Upsolve merged into `/train` with tabs to reduce sidebar clutter
2. **Compete Hub**: PvP Arena + Leaderboard merged into `/compete` — everything competitive in one place
3. **Library naming**: "Intel Database" renamed to "Library" for clarity and consistency
4. **Drill naming**: Solo "Arena Mode" renamed to "Drill" to prevent confusion with PvP Arena
5. **Backward compatibility**: Old routes (`/practice`, `/problems`, `/arena`, `/leaderboard`) redirect to their new locations
