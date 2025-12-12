# V0: Proof of Concept Implementation Plan

> **Goal:** Validate the core user flow: Connect Google Calendar -> View events in custom UI
> **Scope:** No database, no persistence, JWT-only sessions
> **Strategy:** TDD (Test-Driven Development) for all core logic and components

---

## Overview

| Phase | Name | Directory | Deliverables |
|-------|------|-----------|--------------|
| 0 | Project Setup | `localcal-ui/` | Next.js app, Vitest, env config |
| 1 | Authentication | `localcal-ui/src/lib/auth.ts` | Auth.js with Google OAuth |
| 2 | Calendar Integration | `localcal-ui/src/lib/google-calendar.ts` | Google Calendar API fetch (with tests) |
| 3 | UI Components | `localcal-ui/src/components/` | Landing, Calendar page, Component (with tests) |
| 4 | Verification | - | Full test suite pass, manual verification |

> **Note:** `localcal-service/` is not used in V0.

---

## Phase 0: Project Setup

### 0.1 Initialize Next.js Application

**Directory:** `localcal-ui/`

```bash
cd localcal-monorepo
npx create-next-app@latest localcal-ui --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind
```

### 0.2 Install Dependencies

```bash
cd localcal-ui
npm install next-auth@beta
npm install sass
npm install -D @types/node vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier
```

**Dependencies:**
| Package | Purpose |
|---------|---------|
| `next-auth@beta` | Auth.js v5 for App Router |
| `vitest` | Unit testing framework |
| `@testing-library/*` | React component testing |

### 0.3 Configure Vitest

**File:** `localcal-ui/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**File:** `localcal-ui/src/tests/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

### 0.4 Configure Environment

**File:** `localcal-ui/.env.local`

```bash
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
NEXTAUTH_URL=http://localhost:3000
```

### 0.5 Configure Scripts

Update `package.json`:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "next lint",
  "format": "prettier --write ."
}
```

### 0.6 Configure Root Layout

**File:** `localcal-ui/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'LocalCal',
  description: 'Your local calendar assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## Phase 1: Authentication

### 1.1 Create Auth.js Configuration

**File:** `localcal-ui/src/lib/auth.ts`

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
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
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

### 1.2 Create Auth Route Handler

**File:** `localcal-ui/src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

### 1.3 Create Auth Button Component

**File:** `localcal-ui/src/components/AuthButton.tsx`

```typescript
import { auth, signIn, signOut } from '@/lib/auth';

export async function AuthButton() {
  const session = await auth();

  if (session?.user) {
    return (
      <form
        action={async () => {
          'use server';
          await signOut();
        }}
      >
        <p>Signed in as {session.user.email}</p>
        <button type="submit">Sign Out</button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await signIn('google');
      }}
    >
      <button type="submit">Connect Google Calendar</button>
    </form>
  );
}
```

---

## Phase 2: Calendar Integration

### 2.1 Create Types

**File:** `localcal-ui/src/types/calendar.ts`

```typescript
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
  location?: string;
}

export interface GoogleCalendarResponse {
  items: GoogleCalendarEvent[];
}
```

### 2.2 Write Failing Test: Google Calendar Client

**File:** `localcal-ui/src/lib/google-calendar.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGoogleCalendarEvents } from './google-calendar';

global.fetch = vi.fn();

describe('fetchGoogleCalendarEvents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('fetches and transforms events correctly', async () => {
    const mockResponse = {
      items: [
        {
          id: '1',
          summary: 'Meeting',
          start: { dateTime: '2024-01-01T10:00:00Z' },
          end: { dateTime: '2024-01-01T11:00:00Z' },
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const events = await fetchGoogleCalendarEvents('fake-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://www.googleapis.com/calendar/v3'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer fake-token' },
      })
    );
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Meeting');
  });

  it('throws error on non-ok response', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchGoogleCalendarEvents('bad-token')).rejects.toThrow(
      'Google Calendar API error: 401'
    );
  });
});
```

### 2.3 Implement Google Calendar Client

**File:** `localcal-ui/src/lib/google-calendar.ts`

```typescript
import type { CalendarEvent, GoogleCalendarResponse } from '@/types/calendar';

export async function fetchGoogleCalendarEvents(
  accessToken: string
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();
  // 90 days in future
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', now);
  url.searchParams.set('timeMax', future);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }

  const data: GoogleCalendarResponse = await res.json();

  return (data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(No title)',
    start: event.start.dateTime || event.start.date || '',
    end: event.end.dateTime || event.end.date || '',
    description: event.description,
    location: event.location,
  }));
}
```

### 2.4 Create Events Route Handler

**File:** `localcal-ui/src/app/api/events/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar';

export async function GET() {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const events = await fetchGoogleCalendarEvents(session.accessToken);
    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
```

---

## Phase 3: UI Components

### 3.1 Write Failing Test: Calendar Component

**File:** `localcal-ui/src/components/Calendar.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Calendar } from './Calendar';

const mockEvents = [
  {
    id: '1',
    title: 'Test Event',
    start: '2024-01-01T10:00:00Z',
    end: '2024-01-01T11:00:00Z',
    location: 'Office',
  },
];

describe('Calendar', () => {
  it('renders "No upcoming events" when empty', () => {
    render(<Calendar events={[]} />);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it('renders event details', () => {
    render(<Calendar events={mockEvents} />);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Office')).toBeInTheDocument();
  });
});
```

### 3.2 Implement Calendar Component

**File:** `localcal-ui/src/components/Calendar.tsx`

```typescript
import type { CalendarEvent } from '@/types/calendar';

interface CalendarProps {
  events: CalendarEvent[];
}

export function Calendar({ events }: CalendarProps) {
  if (events.length === 0) {
    return <p>No upcoming events.</p>;
  }

  return (
    <div role="list" aria-label="Calendar events" className="calendar-list">
      {events.map((event) => (
        <article key={event.id} role="listitem" className="calendar-event">
          <h3>{event.title}</h3>
          <time dateTime={event.start}>
            {new Date(event.start).toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
          {event.location && <p className="location">{event.location}</p>}
        </article>
      ))}
    </div>
  );
}
```

### 3.3 Create Global Styles

**File:** `localcal-ui/src/app/globals.scss`

```scss
.calendar-list {
  display: grid;
  gap: 1rem;
}

.calendar-event {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 4px;

  h3 {
    margin: 0 0 0.5rem 0;
    font-weight: bold;
  }

  time, .location {
    display: block;
    font-size: 0.9rem;
    color: #666;
  }
}

main {
  padding: 2rem;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
```

### 3.3 Create Pages

**File:** `localcal-ui/src/app/page.tsx` (Landing)

```typescript
import { AuthButton } from '@/components/AuthButton';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (session?.accessToken) redirect('/calendar');
  
  return (
    <main>
      <h1>LocalCal</h1>
      <p>Connect your Google Calendar to view your events.</p>
      <AuthButton />
    </main>
  );
}
```

**File:** `localcal-ui/src/app/calendar/page.tsx` (Calendar)

```typescript
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar';
import { Calendar } from '@/components/Calendar';
import { AuthButton } from '@/components/AuthButton';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.accessToken) redirect('/');

  const events = await fetchGoogleCalendarEvents(session.accessToken);

  return (
    <main>
      <header>
        <h1>Your Calendar</h1>
        <AuthButton />
      </header>
      <Calendar events={events} />
    </main>
  );
}
```

---

## Phase 4: Verification

### 4.1 Automated Tests

Run the full test suite. All tests must pass.

```bash
cd localcal-ui
npm run test
```

### 4.2 Manual Verification

1.  **Auth Flow:** Sign in with Google -> Redirects to `/calendar`.
2.  **Data Fetch:** Verify real events from Google Calendar appear.
3.  **Sign Out:** Redirects to `/`.
4.  **Security:** Accessing `/calendar` without session redirects to `/`.

### 4.3 Code Quality

```bash
npm run typecheck
npm run lint
npm run format
```

---

## Google Cloud Console Notes

- **Redirect URI:** `http://localhost:3000/api/auth/callback/google`
- **Scopes:** `.../auth/calendar.readonly`
- **Test Users:** Add your email to Test Users in OAuth consent screen.
