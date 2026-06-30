'use client';

import { useState } from 'react';
import { Button, Input, FormControl, FormErrorMessage, useToast } from '@chakra-ui/react';

interface CommentFormProps {
  groupId: string;
  itemId: string;
  onCommentPosted: () => void;
}

/**
 * CommentForm: Input form for posting comments on wishlist items
 * - Text input with placeholder "Add a comment..."
 * - Post button (disabled when empty)
 * - Validation error display
 * - Loading state during submission
 * - Toast notification on success
 */
export function CommentForm({ groupId, itemId, onCommentPosted }: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const isDisabled = !content.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDisabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/groups/${groupId}/wishlist/${itemId}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: content.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Failed to post comment (${response.status})`
        );
      }

      // Clear input and notify parent
      setContent('');
      toast({
        title: 'Comment posted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Trigger parent to refresh comments
      onCommentPosted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to post comment';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <FormControl isInvalid={!!error}>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Add a comment..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError(null);
            }}
            disabled={isLoading}
            aria-label="Comment input"
            minH="44px"
            className="flex-1"
          />
          <Button
            type="submit"
            isDisabled={isDisabled}
            isLoading={isLoading}
            colorScheme="blue"
            minH="44px"
            minW="100px"
          >
            Post
          </Button>
        </div>
        {error && <FormErrorMessage>{error}</FormErrorMessage>}
      </FormControl>
    </form>
  );
}
