import type { CalendarEvent, GoogleCalendarResponse } from '@/types/calendar';

export async function fetchGoogleCalendarEvents(
  accessToken: string
): Promise<CalendarEvent[]> {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const url = new URL(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events'
  );
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
