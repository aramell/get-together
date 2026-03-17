import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { WishlistItem } from '@/components/groups/WishlistItem';

const renderWithChakra = (component: React.ReactNode) => {
  return render(
    <ChakraProvider>
      {component}
    </ChakraProvider>
  );
};

describe('WishlistItem Component', () => {
  const mockProps = {
    id: 'item-1',
    title: 'Concert Tickets',
    description: 'Summer concerts',
    link: 'https://ticketmaster.com',
    creator_name: 'John Doe',
    creator_email: 'john@example.com',
    created_at: '2026-03-16T10:00:00Z',
  };

  it('should render item with title', () => {
    renderWithChakra(<WishlistItem {...mockProps} />);
    expect(screen.getByText('Concert Tickets')).toBeInTheDocument();
  });

  it('should display interest count', () => {
    renderWithChakra(<WishlistItem {...mockProps} interest_count={5} />);
    expect(screen.getByText('5 interested')).toBeInTheDocument();
  });

  it('should show "You\'re interested" badge when user is interested', () => {
    renderWithChakra(
      <WishlistItem {...mockProps} interest_count={3} user_is_interested={true} />
    );
    expect(screen.getByText("You're interested")).toBeInTheDocument();
  });

  it('should not show "You\'re interested" badge when user is not interested', () => {
    renderWithChakra(
      <WishlistItem {...mockProps} interest_count={3} user_is_interested={false} />
    );
    expect(screen.queryByText("You're interested")).not.toBeInTheDocument();
  });

  it('should display zero interest count by default', () => {
    renderWithChakra(<WishlistItem {...mockProps} />);
    expect(screen.getByText('0 interested')).toBeInTheDocument();
  });

  it('should render creator name', () => {
    renderWithChakra(<WishlistItem {...mockProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should be keyboard accessible with onClick handler', () => {
    const mockClick = jest.fn();
    const { container } = renderWithChakra(
      <WishlistItem {...mockProps} onClick={mockClick} />
    );
    const itemBox = container.querySelector('[role="button"]');
    expect(itemBox).toBeInTheDocument();
    expect(itemBox).toHaveAttribute('tabIndex', '0');
  });
});
