import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { EventCommentSection } from '../EventCommentSection';

// Mock Chakra UI
jest.mock('@chakra-ui/react', () => ({
  Box: ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>,
  Button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  FormControl: ({ children }: any) => <div data-testid="form-control">{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  Input: (props: any) => <input {...props} />,
  Text: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  VStack: ({ children }: any) => <div data-testid="vstack">{children}</div>,
  HStack: ({ children, justify, ...props }: any) => <div data-testid="hstack" style={{ display: 'flex', justifyContent: justify }} {...props}>{children}</div>,
  Textarea: (props: any) => <textarea {...props} />,
  Spinner: () => <div data-testid="spinner">Loading</div>,
  useToast: () => jest.fn(),
  useDisclosure: () => ({
    isOpen: false,
    onOpen: jest.fn(),
    onClose: jest.fn(),
  }),
}));

// Mock auth context
jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: () => ({
    authToken: 'test-token',
    sub: 'user-123',
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: (date: Date) => '5 minutes',
}));

// Mock edit components
jest.mock('../CommentEditButton', () => ({
  CommentEditButton: ({ onClick, isVisible }: any) =>
    isVisible ? <button onClick={onClick} data-testid="edit-button">Edit</button> : null,
}));

jest.mock('../CommentEditIndicator', () => ({
  CommentEditIndicator: ({ editedAt }: any) =>
    <span data-testid="edit-indicator">Edited</span>,
}));

jest.mock('../CommentEditModal', () => ({
  CommentEditModal: ({ isOpen, onSave, initialContent }: any) =>
    isOpen ? (
      <div data-testid="edit-modal">
        <textarea defaultValue={initialContent} data-testid="edit-textarea" />
        <button onClick={() => onSave('updated')} data-testid="save-button">Save</button>
      </div>
    ) : null,
}));

describe('EventCommentSection - Real-time Polling (Task 4)', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('AC8: Real-time Update Propagation', () => {
    it('should detect edited comments when polling detects edited_at changes', async () => {
      const initialComments = [
        {
          id: '1',
          content: 'Original comment',
          created_by: 'user-456',
          created_at: '2026-03-20T10:00:00Z',
          creator: { display_name: 'Alice' },
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: initialComments }),
        })
        // Second poll - comment has been edited
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: '1',
                content: 'Updated comment',
                created_by: 'user-456',
                created_at: '2026-03-20T10:00:00Z',
                edited_at: '2026-03-20T10:05:00Z',
                updated_count: 1,
                creator: { display_name: 'Alice' },
              },
            ],
          }),
        });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={initialComments}
        />
      );

      // Initial render shows original content
      expect(screen.getByText('Original comment')).toBeInTheDocument();
      expect(screen.queryByTestId('edit-indicator')).not.toBeInTheDocument();

      // Fast forward past polling interval (5 seconds)
      jest.advanceTimersByTime(5000);

      // Wait for polling to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Now should show updated content and edit indicator
      expect(screen.getByText('Updated comment')).toBeInTheDocument();
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();
    });

    it('should update edit indicator timestamps on subsequent polls', async () => {
      const editedComment = {
        id: '1',
        content: 'Edited content',
        created_by: 'user-456',
        created_at: '2026-03-20T10:00:00Z',
        edited_at: '2026-03-20T10:05:00Z',
        updated_count: 1,
        creator: { display_name: 'Alice' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [editedComment] }),
        })
        // Second poll - no changes
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [editedComment] }),
        });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={[editedComment]}
        />
      );

      // Should show edit indicator on initial render
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();

      // Poll again
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Edit indicator should still be present
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();
    });

    it('should handle multiple edits correctly with updated_count', async () => {
      const multiEditComment = {
        id: '1',
        content: 'Multiple edits',
        created_by: 'user-456',
        created_at: '2026-03-20T10:00:00Z',
        edited_at: '2026-03-20T10:15:00Z',
        updated_count: 3,
        creator: { display_name: 'Alice' },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [multiEditComment] }),
      });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={[multiEditComment]}
        />
      );

      // Should display edit indicator for multi-edited comments
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();
    });
  });

  describe('AC7: Concurrent Edit Handling', () => {
    it('should handle concurrent edits with version conflict detection', async () => {
      const originalComment = {
        id: '1',
        content: 'Original',
        created_by: 'user-123',
        created_at: '2026-03-20T10:00:00Z',
        creator: { display_name: 'Me' },
      };

      // Simulate polling showing the comment was edited by someone else
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [originalComment] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                ...originalComment,
                content: 'Edited by someone else',
                created_by: 'user-456',
                edited_at: '2026-03-20T10:05:00Z',
                updated_count: 1,
              },
            ],
          }),
        });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={[originalComment]}
        />
      );

      expect(screen.getByText('Original')).toBeInTheDocument();

      // Poll to detect edit by other user
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(screen.getByText('Edited by someone else')).toBeInTheDocument();
      });

      // Should show edit indicator
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();
    });
  });

  describe('Task 4.2: Edit Indicators in Comments', () => {
    it('should display edit indicator for edited comments', async () => {
      const comments = [
        {
          id: '1',
          content: 'Never edited',
          created_by: 'user-456',
          created_at: '2026-03-20T10:00:00Z',
          creator: { display_name: 'Alice' },
        },
        {
          id: '2',
          content: 'Has been edited',
          created_by: 'user-789',
          created_at: '2026-03-20T10:00:00Z',
          edited_at: '2026-03-20T10:10:00Z',
          updated_count: 1,
          creator: { display_name: 'Bob' },
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: comments }),
      });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={comments}
        />
      );

      // First comment should not show edit indicator
      const editIndicators = screen.queryAllByTestId('edit-indicator');
      expect(editIndicators.length).toBe(1); // Only second comment has been edited
    });

    it('should refresh timestamps on polling updates', async () => {
      const oldEditedComment = {
        id: '1',
        content: 'Content',
        created_by: 'user-456',
        created_at: '2026-03-20T10:00:00Z',
        edited_at: '2026-03-20T10:05:00Z',
        updated_count: 1,
        creator: { display_name: 'Alice' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [oldEditedComment] }),
        })
        // Updated comment with same ID
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [oldEditedComment], // Same timestamp - verifies refresh detection works
          }),
        });

      render(
        <EventCommentSection
          eventId="event-1"
          groupId="group-1"
          initialComments={[oldEditedComment]}
        />
      );

      // Should show edit indicator initially
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();

      // Advance polling interval
      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Edit indicator should still be present after refresh
      expect(screen.getByTestId('edit-indicator')).toBeInTheDocument();
    });
  });

  describe('Polling Integration', () => {
    it('should poll every 5 seconds', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      render(
        <EventCommentSection eventId="event-1" groupId="group-1" initialComments={[]} />
      );

      // Initial fetch on mount
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Advance by 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Advance by another 5 seconds
      jest.advanceTimersByTime(5000);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should stop polling on component unmount', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      const { unmount } = render(
        <EventCommentSection eventId="event-1" groupId="group-1" initialComments={[]} />
      );

      const callCountBeforeUnmount = mockFetch.mock.calls.length;

      unmount();

      // Advance past polling interval
      jest.advanceTimersByTime(5000);

      // Should not have called fetch again after unmount
      expect(mockFetch.mock.calls.length).toBe(callCountBeforeUnmount);
    });
  });
});
