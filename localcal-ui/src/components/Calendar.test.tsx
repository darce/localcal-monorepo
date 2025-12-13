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
  {
    id: '2',
    title: 'Second Event',
    start: '2024-01-02T14:00:00Z',
    end: '2024-01-02T15:00:00Z',
  },
];

describe('Calendar', () => {
  it('renders "No upcoming events" when empty', () => {
    render(<Calendar events={[]} />);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });

  it('renders event list with correct role', () => {
    render(<Calendar events={mockEvents} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders all events', () => {
    render(<Calendar events={mockEvents} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders event title', () => {
    render(<Calendar events={mockEvents} />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('renders event location when provided', () => {
    render(<Calendar events={mockEvents} />);
    expect(screen.getByText('Office')).toBeInTheDocument();
  });

  it('does not render location when not provided', () => {
    render(<Calendar events={[mockEvents[1]]} />);
    expect(screen.queryByText('Office')).not.toBeInTheDocument();
  });
});
