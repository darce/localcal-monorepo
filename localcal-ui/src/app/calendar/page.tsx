import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { fetchGoogleCalendarEvents } from '@/lib/google-calendar';
import { Calendar } from '@/components/Calendar';
import { AuthButton } from '@/components/AuthButton';

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/');
  }

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
