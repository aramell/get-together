/**
 * useCommentEdit - Hook for editing comments
 * Story 6.4 Task 3: Service Layer & API Integration
 *
 * Handles API calls to edit event or wishlist comments
 */

import { useCallback, useState } from 'react';

export interface CommentEditParams {
  groupId: string;
  commentId: string;
  newContent: string;
  targetType: 'event' | 'wishlist';
  targetId: string;
}

export interface UseCommentEditResult {
  isLoading: boolean;
  error: string | null;
  editComment: (params: CommentEditParams) => Promise<void>;
}

/**
 * Hook for editing comments
 * Handles both event and wishlist comment edits via the appropriate API endpoints
 */
export function useCommentEdit(): UseCommentEditResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editComment = useCallback(async (params: CommentEditParams) => {
    const { groupId, commentId, newContent, targetType, targetId } = params;

    setIsLoading(true);
    setError(null);

    try {
      // Construct the appropriate API endpoint based on comment type
      const endpoint =
        targetType === 'event'
          ? `/api/groups/${groupId}/events/${targetId}/comments/${commentId}`
          : `/api/groups/${groupId}/wishlist/${targetId}/comments/${commentId}`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || `Failed to edit comment (${response.status})`;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to edit comment');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to edit comment';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    editComment,
  };
}
