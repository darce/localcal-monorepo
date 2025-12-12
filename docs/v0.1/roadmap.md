# LocalCal v0.1 Roadmap

A progressive development guide for calendar synchronization and portfolio editing.

---

## Overview

This roadmap defines two development phases:

| Phase | Name | Database | Features |
|-------|------|----------|----------|
| **V0** | Proof of Concept | None (JWT-only) | Google Calendar fetch + display |
| **V1** | Full Stack | PostgreSQL | Portfolios, calendar sync, ICS feeds |

---

## Phase 0: Proof of Concept (No Database)

### Goals

Validate the core user flow: **Connect Google Calendar -> View events in custom UI**

**What you CAN do:**

- Let the user sign in with Google
- Request Google Calendar permission
- Fetch events live from Google Calendar
- Display events in a custom calendar UI

**What you CANNOT do (yet):**

- Persist anything server-side
- Sync in the background
- Support multi-user accounts

---

### Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Next.js App                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │  │
│  │  │ /           │  │ /calendar   │  │ /api/events      │   │  │
│  │  │ Landing     │  │ Display     │  │ Route Handler    │   │  │
│  │  └─────────────┘  └─────────────┘  └────────┬─────────┘   │  │
│  │                                             │             │  │
│  │  ┌──────────────────────────────────────────┴───────────┐ │  │
│  │  │ Auth.js (JWT session, tokens in cookie)              │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌────────────────────┐
                   │ Google Calendar API│
                   └────────────────────┘
```

**Components:**

- **Next.js App on Vercel**
  - `/` - Landing page with "Connect your Google Calendar"
  - `/calendar` - Shows the user's events
  - `/api/events` - Route handler that calls Google Calendar API

- **Auth.js (NextAuth) with JWT sessions**
  - Session stored in encrypted JWT cookie
  - Google access/refresh tokens stored in JWT
  - No database adapter

- **Data Source: Google Calendar API**
  - All event data fetched directly from Google
  - No local event storage

---

### Authentication Flow

1. User visits `/`
2. Clicks "Sign in with Google / Connect Calendar"
3. Auth.js Google provider redirects to Google OAuth screen
4. User grants `calendar.readonly` scope
5. On callback, Auth.js:
   - Receives tokens
   - Stores access_token and refresh_token in JWT
6. User redirected to `/calendar`
7. `/calendar` page calls `/api/events`
8. `/api/events` extracts token from session, calls Google Calendar API
9. Frontend renders events

---

### Implementation Checklist

#### Auth.js Configuration

**File:** `src/lib/auth.ts`

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
```

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

**Environment Variables:**

```bash
AUTH_SECRET=<random-secret>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
NEXTAUTH_URL=http://localhost:3000
```

#### Events Route Handler

**File:** `app/api/events/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } }
  );
  
  const data = await res.json();
  return NextResponse.json({ events: data.items || [] });
}
```

#### Calendar Page

**File:** `app/calendar/page.tsx`

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { Calendar } from '@/components/Calendar';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return <div>Please sign in to view your calendar.</div>;
  }

  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/events`, {
    headers: { cookie: /* forward cookies */ },
  });
  const { events } = await res.json();
  
  return <Calendar events={events} view="month" />;
}
```

---

### What V0 Does NOT Require

- [ ] Database (no Postgres, Supabase, Neon)
- [ ] Object storage
- [ ] Payment integration
- [ ] Background sync / Cron jobs
- [ ] ICS feed generation

---

## Phase 1: Full Stack Application

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14+ (App Router) |
| **Language** | TypeScript 5.3+ (strict mode) |
| **Auth** | Auth.js with database adapter |
| **Database** | PostgreSQL (Neon or Supabase) |
| **ORM** | Drizzle ORM |
| **Hosting** | Vercel |

---

### Data Model

#### users

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `email` | varchar | Unique |
| `name` | varchar | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### portfolios

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK -> users.id |
| `slug` | varchar | Per-user unique (e.g., `main`, `studio-a`) |
| `title` | varchar | |
| `markdown` | text | Wiki-style content |
| `layout` | enum | `simple`, `two_column` |
| `updated_at` | timestamptz | |

#### events

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK -> users.id |
| `title` | varchar | |
| `description` | text | |
| `start_at` | timestamptz | |
| `end_at` | timestamptz | |
| `location` | varchar | |
| `source` | enum | `local`, `google`, `icloud` |
| `source_event_id` | varchar | Nullable, external provider ID |
| `updated_at` | timestamptz | |

#### calendar_connections

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK -> users.id |
| `provider` | enum | `google`, `icloud_ics` |
| `config_json` | jsonb | `{ refreshToken, calendarId }` or `{ url }` |
| `last_synced_at` | timestamptz | Nullable |

---

### API Endpoints

#### Portfolio CRUD

**File:** `app/api/portfolio/route.ts`

| Method | Description |
|--------|-------------|
| `GET` | Return authenticated user's portfolios |
| `POST` | Create/update portfolio (upsert) |

> All queries scoped by `user_id` for multi-tenant isolation.

---

#### Events API

**File:** `app/api/events/route.ts`

| Method | Description |
|--------|-------------|
| `GET` | List events for current user. Query params: `?from=...&to=...` |
| `POST` | Create/update local events (`source = 'local'`) |

---

#### ICS Feed (Public)

**File:** `app/api/calendar/[userSlug]/ical/route.ts`

Public endpoint (no auth). Returns `.ics` file for subscription.

**Steps:**
1. Resolve `userSlug` -> `user_id`
2. Query events for that user
3. Generate VCALENDAR + VEVENT entries
4. Return with `Content-Type: text/calendar`

---

#### Calendar Connection

**File:** `app/api/calendar/connect/route.ts`

**POST** `{ provider: 'google' | 'icloud_ics', ... }`

- **Google:** Store OAuth tokens in `config_json`
- **iCloud ICS:** Store ICS URL in `config_json`

---

#### Calendar Sync

**File:** `app/api/calendar/sync/route.ts`

- Requires authentication
- For each `calendar_connections` row:
  - **Google:** Use refresh token to fetch events, upsert with `source = 'google'`
  - **iCloud:** Fetch ICS URL, parse events, upsert with `source = 'icloud'`
- Update `last_synced_at`

**Background sync:** Vercel Cron job every 30-60 minutes.

---

### Frontend Pages

#### Portfolio Editor (Dashboard)

**Route:** `app/(dashboard)/portfolio/page.tsx`

- Auth-protected
- Fields: `title`, `layout` select, `markdown` textarea
- Live preview using `renderMarkdown()`
- Debounced auto-save (1s idle -> POST)

#### Public Portfolio

**Route:** `app/[userSlug]/portfolio/page.tsx`

- Server component
- Resolve slug -> user, load portfolio
- Render markdown with layout wrapper
- Read-only public view

#### Calendar Dashboard

**Route:** `app/(dashboard)/calendar/page.tsx`

- Display events from all sources
- Color-coded by source (local, google, icloud)
- Month/week/day views

#### Calendar Connection Settings

**Route:** `app/(dashboard)/settings/page.tsx` or inline in calendar

- "Connect Google Calendar" button
- "Add iCloud ICS URL" input
- Show connection status and `last_synced_at`
- "Sync Now" button

---

### Calendar Component

**File:** `components/Calendar.tsx`

```typescript
type CalendarEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  source: 'local' | 'google' | 'icloud';
};

interface CalendarProps {
  events: CalendarEvent[];
  view: 'month' | 'week' | 'day';
}
```

**Accessibility:**
- `role="grid"` for calendar
- `role="row"` / `role="gridcell"` for days
- Keyboard navigation (arrow keys, Enter)

**i18n:**
- Use `Intl.DateTimeFormat` for localized date formatting

---

### Markdown Rendering

**File:** `lib/markdown.ts`

```typescript
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeReact from 'rehype-react';

export function renderMarkdown(markdown: string): React.ReactNode {
  // Parse markdown -> sanitize -> React elements
}
```

**Features:**
- GitHub-flavored Markdown
- Wiki links: `[[Page Name]]` -> internal links
- Link sanitization (no unsafe protocols)

---

## Summary

This guide defines the minimal pieces needed to:

- [V0] Validate Google Calendar connection and display
- [V1] Edit user portfolios in a wiki-style Markdown editor
- [V1] Render portfolios publicly with controlled layouts
- [V1] Show a calendar of local + external events
- [V1] Sync events from Google/Apple calendars
- [V1] Expose a public ICS feed for external subscription
