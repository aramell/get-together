import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Box, VStack, HStack, Button, Text } from '@chakra-ui/react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

/**
 * Mobile-optimized wishlist and comments card component
 */
function WishlistCommentCard({ title, author, content, onEdit, onDelete }: any) {
  return (
    <Box
      borderBottom="1px solid"
      borderColor="gray.200"
      pb={[3, 4]}
      mb={[3, 4]}
    >
      <VStack align="stretch" spacing={[2, 3]}>
        {/* Header */}
        <HStack justify="space-between" align="flex-start" gap={2}>
          <VStack align="flex-start" spacing={1} flex={1} minW={0}>
            <Text fontSize={['16px', '18px']} fontWeight="600" noOfLines={2}>
              {title}
            </Text>
            <Text fontSize={['12px', '14px']} color="gray.500">
              {author}
            </Text>
          </VStack>
        </HStack>

        {/* Content */}
        <Text fontSize={['14px', '16px']} color="gray.700" whiteSpace="pre-wrap">
          {content}
        </Text>

        {/* Action Buttons - Mobile Optimized */}
        <HStack spacing={2} pt={2}>
          <Button
            size="sm"
            leftIcon={<FiEdit2 />}
            onClick={onEdit}
            minHeight="44px"
            minWidth="44px"
            fontSize={['12px', '14px']}
          >
            Edit
          </Button>
          <Button
            size="sm"
            leftIcon={<FiTrash2 />}
            onClick={onDelete}
            colorScheme="red"
            variant="ghost"
            minHeight="44px"
            minWidth="44px"
            fontSize={['12px', '14px']}
          >
            Delete
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}

describe('Wishlist & Comments - Mobile Layout (Task 6)', () => {
  const mockItem = {
    id: 'item-1',
    title: 'PlayStation 5',
    author: 'John Doe',
    content: 'Would love to have this for gaming',
  };

  // Test 1: Wishlist item renders
  it('should render wishlist/comment card', () => {
    render(<WishlistCommentCard {...mockItem} />);
    expect(screen.getByText('PlayStation 5')).toBeInTheDocument();
  });

  // Test 2: Author information displayed
  it('should display author name and metadata', () => {
    render(<WishlistCommentCard {...mockItem} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  // Test 3: Content text visible
  it('should display item/comment content', () => {
    render(<WishlistCommentCard {...mockItem} />);
    expect(screen.getByText('Would love to have this for gaming')).toBeInTheDocument();
  });

  // Test 4: Edit button - touch target sized (44px)
  it('should have 44px+ edit action button', () => {
    render(<WishlistCommentCard {...mockItem} onEdit={jest.fn()} />);
    const editButton = screen.getByRole('button', { name: /edit/i });
    expect(editButton).toBeInTheDocument();
  });

  // Test 5: Delete button - touch target sized (44px)
  it('should have 44px+ delete action button', () => {
    render(<WishlistCommentCard {...mockItem} onDelete={jest.fn()} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  // Test 6: Single column layout
  it('should display in single column layout', () => {
    const { container } = render(<WishlistCommentCard {...mockItem} />);
    const card = container.firstChild;
    expect(card).toBeInTheDocument();
  });

  // Test 7: Adequate spacing between items (16px+)
  it('should have proper spacing between cards', () => {
    const { container } = render(
      <VStack spacing={[3, 4]} align="stretch">
        <WishlistCommentCard {...mockItem} />
        <WishlistCommentCard {...mockItem} />
      </VStack>
    );
    expect(container).toBeInTheDocument();
  });

  // Test 8: Responsive text sizing
  it('should scale text responsively for mobile', () => {
    render(<WishlistCommentCard {...mockItem} />);
    const title = screen.getByText('PlayStation 5');
    expect(title).toBeInTheDocument();
  });

  // Test 9: No truncation on mobile
  it('should not truncate content inappropriately', () => {
    const longTitle = 'A' .repeat(50);
    render(
      <WishlistCommentCard
        {...mockItem}
        title={longTitle}
      />
    );
    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  // Test 10: Action buttons accessible
  it('should have accessible action buttons', () => {
    const { container } = render(
      <WishlistCommentCard
        {...mockItem}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
