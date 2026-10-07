import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventLabelsProvider, useWidgetLabel } from '@/components/groups/EventLabelsContext';

function Probe() {
  return <span data-testid="label">{useWidgetLabel('logistics')}</span>;
}

describe('EventLabelsContext', () => {
  it('falls back to registry labels with no provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('label')).toHaveTextContent('Logistics');
  });

  it('uses the event type labels inside a provider', () => {
    render(
      <EventLabelsProvider eventType="dinner">
        <Probe />
      </EventLabelsProvider>
    );
    expect(screen.getByTestId('label')).toHaveTextContent('Who brings what');
  });

  it('uses registry labels for a null or Trip type', () => {
    for (const eventType of [null, 'trip']) {
      const { unmount } = render(
        <EventLabelsProvider eventType={eventType}>
          <Probe />
        </EventLabelsProvider>
      );
      expect(screen.getByTestId('label')).toHaveTextContent('Logistics');
      unmount();
    }
  });
});
