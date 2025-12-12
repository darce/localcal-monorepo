# Development Instructions

Build a maintainable, testable Vercel app for self-authored content and calendar synchronization using Next.js, TypeScript, and Auth.js.

---

## Technology Stack

### Core Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.3+ with `strict: true`
- **Runtime**: Node.js 20+
- **Auth**: Auth.js (NextAuth) with Google OAuth
- **Database**: PostgreSQL (Neon/Supabase) with Drizzle ORM
- **Hosting**: Vercel

### Development Tools

| Tool       | Purpose                 | Command                |
| ---------- | ----------------------- | ---------------------- |
| TypeScript | Type checking           | `npx tsc --noEmit`     |
| ESLint     | Linting                 | `npm run lint`         |
| Prettier   | Formatting              | `npm run format`       |
| Vitest     | Unit/integration tests  | `npm run test`         |
| Playwright | E2E tests               | `npm run test:e2e`     |

### Package Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Critical Rules

### Greenfield Policy

This project has no production users. Storage surfaces (database tables, caches) are disposable. Prefer clean rewrites over migrations or backward-compatibility shims. Keep tests in lockstep with schema changes.

### Remove Over Flag

No existing install base means full latitude to delete experimental features. Prefer removal over long-lived feature flags. Re-introduce features behind tests when truly needed.

### No Fabricated Data

Never fabricate benchmark numbers, latency claims, or metrics. If data is unavailable, return an explicit empty state or error.

---

## Project Structure

```text
localcal-monorepo/
├── localcal-ui/              # Next.js frontend application
│   ├── src/
│   │   ├── app/              # App Router pages and layouts
│   │   │   ├── api/          # Route handlers (backend)
│   │   │   ├── (dashboard)/  # Protected dashboard routes
│   │   │   └── [userSlug]/   # Public user pages
│   │   ├── components/       # Reusable React components
│   │   ├── lib/              # Shared utilities and helpers
│   │   └── types/            # TypeScript type definitions
├── localcal-service/         # Backend services (future)
└── docs/                     # Documentation
    └── v0.1/                 # Version-specific docs
```

---

## Development Workflow

### Before You Code

1. **Check the roadmap**: Review `docs/v0.1/roadmap.md` for current phase
2. **Understand the scope**: Version 0 = no DB, Version 1 = full stack
3. **Run checks**: Ensure `npm run typecheck && npm run lint` passes

### Development Loop

1. Create a feature branch: `feat/calendar-ui`
2. Write failing tests first (TDD when applicable)
3. Implement minimal code to pass tests
4. Run full validation: `npm run typecheck && npm run lint && npm run test`
5. Commit with Conventional Commits format

### Conventional Commits

```text
feat(calendar): add Google Calendar sync
fix(auth): correct token refresh logic
docs(readme): update setup instructions
test(events): add integration tests for event fetching
refactor(api): simplify error handling
chore(deps): update next to 14.1
```

---

## Code Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }]
  }
}
```

### ESLint Configuration

Use Next.js recommended config with TypeScript support:

```js
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Code Style Rules

- **No `any` types** without documented justification
- **Arrow functions** for components and utilities: `export const Component = () => {}`
- **Explicit return types** for exported functions
- **2-space indentation** for all files

---

## React & Next.js Guidelines

### Component Structure

```tsx
// components/Calendar.tsx
import type { CalendarEvent } from '@/types';

interface CalendarProps {
  events: CalendarEvent[];
  view: 'month' | 'week' | 'day';
}

export const Calendar = ({ events, view }: CalendarProps) => {
  // Implementation
};
```

### Component Limits

- Maximum **250 lines** per component file
- Maximum **5 useState** hooks (use `useReducer` for complex state)
- Maximum **3 useEffect** hooks (prefer derived state)
- Maximum **10 props** (split component if exceeded)

### State Management

```tsx
// BAD: Syncing props to state
const [value, setValue] = useState(initialValue);
useEffect(() => setValue(initialValue), [initialValue]);

// GOOD: Use prop directly or useMemo
const value = initialValue;
const derived = useMemo(() => compute(initialValue), [initialValue]);
```

### Data Fetching

Use Server Components for data fetching when possible:

```tsx
// src/app/calendar/page.tsx (Server Component)
export default async function CalendarPage() {
  const session = await auth();
  const events = await fetchEvents(session.accessToken);
  return <Calendar events={events} view="month" />;
}
```

For client-side fetching, use React's built-in hooks or a library:

```tsx
// Client component example
'use client';

import { useEffect, useState } from 'react';

export function EventList() {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    fetch('/api/events').then(res => res.json()).then(setEvents);
  }, []);
  
  return <ul>{events.map(e => <li key={e.id}>{e.title}</li>)}</ul>;
}
```

---

## Testing Standards

### Test Pyramid

```text
       ^
      / \
     /E2E\      <- Few, slow, high confidence
    /-----\
   / Integ \    <- Some, medium speed
  /---------\
 /   Unit    \  <- Many, fast, isolated
/-------------\
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `e2e/*.spec.ts`

### Vitest Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Writing Tests

```ts
// lib/formatDate.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formats ISO date to readable string', () => {
    expect(formatDate('2024-01-15T10:00:00Z')).toBe('January 15, 2024');
  });
});
```

### Deterministic Tests

- No network calls without mocks
- No time-based logic without controlled clocks
- Use fixed seeds for random values
- Mock external APIs (Google Calendar) in tests

---

## Auth.js Configuration

### Setup (Version 0: JWT-only, no DB)

```ts
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: { scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly' },
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

// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

### Environment Variables

```bash
# Required for Auth.js
AUTH_SECRET=your-secret-here
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
```

---

## API Route Handlers

### Standard Pattern

```ts
// src/app/api/events/route.ts
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
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
```

---

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Include ARIA labels for screen readers
- Meet WCAG 2.1 AA standards
- Use semantic HTML elements
- Test with screen readers when feasible

---

## Documentation Standards

### File Organization

```text
docs/
├── rules/
│   └── instructions.md     # This file
└── v0.1/
    └── roadmap.md          # Current version roadmap
```

### ASCII Only in Docs

Use ASCII characters only:
- `[x]` instead of checkmark emoji
- `[ ]` instead of X emoji  
- `->` instead of arrow emoji

Rationale: Emoji cause encoding issues across terminals and CI systems.
