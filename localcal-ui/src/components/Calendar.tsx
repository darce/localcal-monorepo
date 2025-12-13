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
