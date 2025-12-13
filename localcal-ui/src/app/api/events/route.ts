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
    console.error('Failed to fetch calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
