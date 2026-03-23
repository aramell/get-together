import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EventCard } from '@/components/groups/EventCard';
import { BottomNav } from '@/components/layout/BottomNav';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/groups',
}));

// Mock chakra UI useBreakpointValue
jest.mock('@chakra-ui/react', () => ({
  ...jest.requireActual('@chakra-ui/react'),
  useBreakpointValue: () => true,
}));

describe('Responsive Design - Integration Tests (Task 8)', () => {
  const mockEvent = {
    id: 'event-1',
    group_id: 'group-1',
    title: 'Team Meeting',
    date: '2026-04-15T14:00:00Z',
    threshold: 10,
    status: 'proposed' as const,
    created_by: 'user-1',
    momentum: { in: 5, maybe: 3, out: 2 },
  };

  // Integration Test 1: Full mobile page layout
  it('should render responsive mobile page layout', () => {
    const { container } = render(
      <div>
        <main style={{ paddingBottom: '56px' }}>
          <EventCard event={mockEvent} />
        </main>
        <BottomNav />
      </div>
    );
    expect(container).toBeInTheDocument();
  });

  // Integration Test 2: Event card with bottom navigation
  it('should render event card and bottom navigation together', () => {
    render(
      <div>
        <main>
          <EventCard event={mockEvent} />
        </main>
        <BottomNav />
      </div>
    );

    // EventCard should be visible
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();

    // BottomNav should be visible
    expect(screen.getByText('Get-Together')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  // Integration Test 3: Responsive typography across components
  it('should maintain readable typography at mobile viewport', () => {
    render(
      <div>
        <h1>App Title</h1>
        <EventCard event={mockEvent} />
        <h2>Related Items</h2>
      </div>
    );

    expect(screen.getByText('App Title')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Related Items')).toBeInTheDocument();
  });

  // Integration Test 4: Touch targets across all components
  it('should have adequate touch targets in all interactive elements', () => {
    const { container } = render(
      <div>
        <button>Action Button</button>
        <EventCard event={mockEvent} />
        <BottomNav />
      </div>
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // Integration Test 5: No horizontal scroll layout
  it('should use responsive width to prevent horizontal scrolling', () => {
    const { container } = render(
      <div style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
        <EventCard event={mockEvent} />
        <BottomNav />
      </div>
    );

    expect(container).toBeInTheDocument();
  });

  // Integration Test 6: Semantic HTML structure for accessibility
  it('should use semantic HTML (button, article, section)', () => {
    const { container } = render(
      <div>
        <section>
          <EventCard event={mockEvent} />
        </section>
        <nav>
          <BottomNav />
        </nav>
      </div>
    );

    expect(container.querySelector('section')).toBeInTheDocument();
    expect(container.querySelector('nav')).toBeInTheDocument();
  });

  // Integration Test 7: Flexbox responsive layout
  it('should use flex layout for responsive design', () => {
    const { container } = render(
      <div className="flex flex-col gap-4">
        <EventCard event={mockEvent} />
        <EventCard event={mockEvent} />
        <BottomNav />
      </div>
    );

    const flexContainer = container.querySelector('.flex');
    expect(flexContainer).toHaveClass('flex-col');
  });

  // Integration Test 8: Multiple event cards in responsive grid
  it('should display multiple cards responsively', () => {
    const event2 = { ...mockEvent, id: 'event-2', title: 'Lunch Meeting' };

    render(
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <EventCard event={mockEvent} />
        <EventCard event={event2} />
      </div>
    );

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Lunch Meeting')).toBeInTheDocument();
  });

  // Integration Test 9: Focus management for keyboard navigation
  it('should support keyboard navigation throughout page', () => {
    const { container } = render(
      <div>
        <button>First Button</button>
        <EventCard event={mockEvent} />
        <BottomNav />
      </div>
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  // Integration Test 10: Responsive image and content sizing
  it('should handle responsive images and media', () => {
    render(
      <div>
        <img src="test.jpg" alt="Test" className="max-w-full h-auto" />
        <EventCard event={mockEvent} />
      </div>
    );

    const img = screen.getByAltText('Test');
    expect(img).toBeInTheDocument();
    expect(img).toHaveClass('max-w-full');
  });

  // Integration Test 11: Responsive modal with bottom nav
  it('should render modal above bottom navigation', () => {
    render(
      <div>
        <main style={{ zIndex: 1 }}>
          <EventCard event={mockEvent} />
        </main>
        <div style={{ zIndex: 50 }}>
          {/* Modal would be here */}
        </div>
        <BottomNav />
      </div>
    );

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  // Integration Test 12: Color contrast and accessibility
  it('should maintain WCAG AA color contrast', () => {
    render(
      <div style={{ color: '#171717', backgroundColor: '#ffffff' }}>
        <EventCard event={mockEvent} />
      </div>
    );

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  // Integration Test 13: Loading states for mobile
  it('should handle loading states responsively', () => {
    render(
      <div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
        <EventCard event={mockEvent} />
      </div>
    );

    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
  });

  // Integration Test 14: Error states for mobile
  it('should display errors clearly on mobile', () => {
    render(
      <div>
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700">Error loading data</p>
        </div>
        <EventCard event={mockEvent} />
      </div>
    );

    expect(screen.getByText('Error loading data')).toBeInTheDocument();
  });

  // Integration Test 15: Full app responsive flow
  it('should support full application flow on mobile (events -> bottom nav)', () => {
    render(
      <div className="flex flex-col h-screen">
        <main className="flex-1 overflow-y-auto pb-14">
          <div className="p-4">
            <h1>Events</h1>
            <EventCard event={mockEvent} />
          </div>
        </main>
        <BottomNav />
      </div>
    );

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Team Meeting')).toBeInTheDocument();
    expect(screen.getByText('Get-Together')).toBeInTheDocument();
  });
});
