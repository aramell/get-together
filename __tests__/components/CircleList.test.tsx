import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChakraProvider } from '@chakra-ui/react';
import { CircleList } from '@/components/circles/CircleList';

const renderWithChakra = (component: React.ReactElement) => {
  return render(<ChakraProvider>{component}</ChakraProvider>);
};

describe('CircleList (Story 10.3)', () => {
  const circles = [
    { id: 'circle-1', name: 'Weekend Crew', contactCount: 5, createdAt: '2026-06-30T10:00:00Z' },
    { id: 'circle-2', name: 'Book Club', contactCount: 1, createdAt: '2026-07-01T10:00:00Z' },
  ];

  const defaultProps = {
    circles,
    onCreateClick: jest.fn(),
    onCircleClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the Create Circle button (AC1)', () => {
    renderWithChakra(<CircleList {...defaultProps} />);

    expect(screen.getByRole('button', { name: /create circle/i })).toBeInTheDocument();
  });

  it('shows each circle with name, contact count, and date created (AC1)', () => {
    renderWithChakra(<CircleList {...defaultProps} />);

    expect(screen.getByText('Weekend Crew')).toBeInTheDocument();
    expect(screen.getByText('5 contacts')).toBeInTheDocument();
    expect(screen.getByText('Book Club')).toBeInTheDocument();
    expect(screen.getByText('1 contact')).toBeInTheDocument();
    expect(screen.getAllByText(/Created/).length).toBeGreaterThan(0);
  });

  it('shows the empty state with no circles (AC2)', () => {
    renderWithChakra(<CircleList {...defaultProps} circles={[]} />);

    expect(
      screen.getByText('No circles yet. Create one to bulk-invite your friends.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create circle/i })).toBeInTheDocument();
  });

  it('announces each circle card accessibly (AC8)', () => {
    renderWithChakra(<CircleList {...defaultProps} />);

    expect(screen.getByLabelText('Weekend Crew, 5 contacts')).toBeInTheDocument();
    expect(screen.getByLabelText('Book Club, 1 contact')).toBeInTheDocument();
  });

  it('calls onCircleClick when a circle card is clicked (AC3)', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CircleList {...defaultProps} />);

    await user.click(screen.getByLabelText('Weekend Crew, 5 contacts'));

    expect(defaultProps.onCircleClick).toHaveBeenCalledWith('circle-1');
  });

  it('calls onCreateClick when Create Circle is clicked', async () => {
    const user = userEvent.setup();
    renderWithChakra(<CircleList {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /create circle/i }));

    expect(defaultProps.onCreateClick).toHaveBeenCalled();
  });

  it('is keyboard navigable (AC8)', () => {
    renderWithChakra(<CircleList {...defaultProps} />);

    const card = screen.getByLabelText('Weekend Crew, 5 contacts');
    expect(card.tagName).toBe('BUTTON');
  });
});
