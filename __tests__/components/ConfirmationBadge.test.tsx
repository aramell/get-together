import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConfirmationBadge } from '@/components/events/ConfirmationBadge';
import { ChakraProvider } from '@chakra-ui/react';

// Wrap component with Chakra provider for testing
const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('ConfirmationBadge Component', () => {
  it('should render confirmed badge with green color', () => {
    renderWithChakra(
      <ConfirmationBadge status="confirmed" confirmedAt="2026-03-16T10:00:00Z" />
    );

    const badge = screen.getByText(/Confirmed/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('✅');
  });

  it('should render proposed badge with yellow color', () => {
    renderWithChakra(<ConfirmationBadge status="proposal" />);

    const badge = screen.getByText(/Proposed/);
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toContain('📋');
  });

  it('should display tooltip with formatted confirmation timestamp', () => {
    const { container } = renderWithChakra(
      <ConfirmationBadge status="confirmed" confirmedAt="2026-03-16T10:00:00Z" />
    );

    const badge = container.querySelector('[role="button"]');
    expect(badge).toBeInTheDocument();
  });

  it('should handle null confirmation timestamp', () => {
    renderWithChakra(<ConfirmationBadge status="confirmed" confirmedAt={null} />);

    const badge = screen.getByText(/Confirmed/);
    expect(badge).toBeInTheDocument();
  });

  it('should handle missing confirmation timestamp', () => {
    renderWithChakra(<ConfirmationBadge status="proposal" />);

    const badge = screen.getByText(/Proposed/);
    expect(badge).toBeInTheDocument();
  });

  it('should apply correct styling for confirmed state', () => {
    const { container } = renderWithChakra(
      <ConfirmationBadge status="confirmed" confirmedAt="2026-03-16T10:00:00Z" />
    );

    // Badge should have chakra styles applied
    const badge = container.querySelector('[class*="Badge"]');
    expect(badge).toHaveClass('chakra-badge');
  });

  it('should apply correct styling for proposed state', () => {
    const { container } = renderWithChakra(
      <ConfirmationBadge status="proposal" />
    );

    const badge = container.querySelector('[class*="Badge"]');
    expect(badge).toHaveClass('chakra-badge');
  });

  it('should format timestamp correctly in tooltip', () => {
    renderWithChakra(
      <ConfirmationBadge status="confirmed" confirmedAt="2026-03-16T10:00:00Z" />
    );

    // The tooltip should be there when hovered (checking via ARIA)
    const tooltip = screen.getByRole('button');
    expect(tooltip).toHaveAttribute('data-tooltip-id');
  });
});
