'use client';

import { Box, VStack, Spinner, useToast } from '@chakra-ui/react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { CommentFilterPanel } from './CommentFilterPanel';
import { CommentSearchBox } from './CommentSearchBox';
import { CommentList } from './CommentList';
import { PaginationControls } from './PaginationControls';

interface Comment {
  id: string;
  created_by: string;
  content: string;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
  target_id: string;
  target_type: 'event' | 'wishlist';
  target_name: string;
}

interface Author {
  id: string;
  display_name: string | null;
}

interface CommentsViewProps {
  groupId: string;
}

/**
 * CommentsView: Main container for viewing comments with filtering, search, pagination, and real-time updates
 * Combines: CommentFilterPanel, CommentSearchBox, CommentList, PaginationControls
 * Features: Real-time polling (5 seconds), dynamic filter state management
 */
export function CommentsView({ groupId }: CommentsViewProps) {
  const toast = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter state
  const [contentType, setContentType] = useState<'all' | 'event' | 'wishlist'>('all');
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'author'>('newest');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Data state
  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments from API
  const fetchComments = useCallback(async () => {
    try {
      const offset = (currentPage - 1) * pageSize;
      const params = new URLSearchParams({
        content_type: contentType,
        sort_by: sortBy,
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      if (authorId) {
        params.append('author_id', authorId);
      }

      if (searchQuery) {
        params.append('search_query', searchQuery);
      }

      const response = await fetch(`/api/groups/${groupId}/comments?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setComments(data.data.comments || []);
        setTotalCount(data.data.totalCount || 0);
        setTotalPages(data.data.totalPages || 1);
        setError(null);

        // Extract unique authors from comments for the filter dropdown
        const uniqueAuthors = Array.from(
          new Map(
            data.data.comments.map((c: Comment) => [
              c.created_by,
              { id: c.created_by, display_name: c.display_name },
            ])
          ).values()
        );
        setAuthors(uniqueAuthors);
      } else {
        throw new Error(data.message || 'Failed to fetch comments');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch comments';
      setError(message);
      console.error('Error fetching comments:', err);

      // Show toast only for non-network errors
      if (!(err instanceof Error && err.message.includes('Network'))) {
        toast({
          title: 'Error',
          description: message,
          status: 'error',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [groupId, contentType, authorId, searchQuery, sortBy, currentPage, pageSize, toast]);

  // Initial fetch on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time polling: refetch every 5 seconds
  useEffect(() => {
    pollingIntervalRef.current = setInterval(() => {
      fetchComments();
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchComments]);

  // Handle filter changes - reset to page 1
  const handleFilterChange = (filters: {
    content_type: 'all' | 'event' | 'wishlist';
    author_id: string | null;
    sort_by: 'newest' | 'oldest' | 'author';
  }) => {
    setContentType(filters.content_type);
    setAuthorId(filters.author_id);
    setSortBy(filters.sort_by);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle search changes - reset to page 1
  const handleSearch = (query: string | null) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when search changes
  };

  return (
    <Box className="comments-view" role="region" aria-label="Comments view with filters">
      <VStack align="stretch" spacing={6}>
        {/* Filter Panel */}
        <CommentFilterPanel
          authors={authors}
          contentType={contentType}
          authorId={authorId}
          sortBy={sortBy}
          onFilterChange={handleFilterChange}
        />

        {/* Search Box */}
        <CommentSearchBox onSearch={handleSearch} resultCount={totalCount} />

        {/* Loading State */}
        {isLoading && comments.length === 0 && (
          <Box display="flex" justifyContent="center" py={8}>
            <Spinner size="lg" color="blue.500" />
          </Box>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Box
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
            rounded="md"
            p={4}
            className="text-red-800"
          >
            {error}
          </Box>
        )}

        {/* Comments List */}
        {!error && (
          <>
            <CommentList comments={comments} isLoading={isLoading && comments.length === 0} groupId={groupId} />

            {/* Pagination Controls */}
            {totalPages > 1 && !isLoading && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}
