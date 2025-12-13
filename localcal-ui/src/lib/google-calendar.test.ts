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

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
    });

    await expect(fetchGoogleCalendarEvents('bad-token')).rejects.toThrow(
      'Google Calendar API error: 401'
    );
  });

  it('handles events without summary', async () => {
    const mockResponse = {
      items: [
        {
          id: '2',
          start: { dateTime: '2024-01-02T10:00:00Z' },
          end: { dateTime: '2024-01-02T11:00:00Z' },
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const events = await fetchGoogleCalendarEvents('fake-token');
    expect(events[0].title).toBe('(No title)');
  });

  it('handles all-day events with date instead of dateTime', async () => {
    const mockResponse = {
      items: [
        {
          id: '3',
          summary: 'All Day Event',
          start: { date: '2024-01-03' },
          end: { date: '2024-01-04' },
        },
      ],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const events = await fetchGoogleCalendarEvents('fake-token');
    expect(events[0].start).toBe('2024-01-03');
    expect(events[0].end).toBe('2024-01-04');
  });
});
