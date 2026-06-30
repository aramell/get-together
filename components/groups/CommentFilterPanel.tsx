'use client';

import { Box, Button, Select, VStack, HStack, Text } from '@chakra-ui/react';
import { useMemo } from 'react';

interface Author {
  id: string;
  display_name: string | null;
}

interface CommentFilterPanelProps {
  authors: Author[];
  contentType: 'all' | 'event' | 'wishlist';
  authorId: string | null;
  sortBy: 'newest' | 'oldest' | 'author';
  onFilterChange: (filters: {
    content_type: 'all' | 'event' | 'wishlist';
    author_id: string | null;
    sort_by: 'newest' | 'oldest' | 'author';
  }) => void;
}

/**
 * CommentFilterPanel: Controls for filtering comments by type, author, and sort order
 * Supports: Content type (All/Events/Wishlist), Author filter, Sort options (Newest/Oldest/Author A-Z)
 */
export function CommentFilterPanel({
  authors,
  contentType,
  authorId,
  sortBy,
  onFilterChange,
}: CommentFilterPanelProps) {
  const handleContentTypeChange = (type: 'all' | 'event' | 'wishlist') => {
    onFilterChange({
      content_type: type,
      author_id: authorId,
      sort_by: sortBy,
    });
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAuthorId = e.target.value === '' ? null : e.target.value;
    onFilterChange({
      content_type: contentType,
      author_id: newAuthorId,
      sort_by: sortBy,
    });
  };

  const handleSortChange = (newSort: 'newest' | 'oldest' | 'author') => {
    onFilterChange({
      content_type: contentType,
      author_id: authorId,
      sort_by: newSort,
    });
  };

  const handleClearFilters = () => {
    onFilterChange({
      content_type: 'all',
      author_id: null,
      sort_by: 'newest',
    });
  };

  // Get display name for selected author
  const selectedAuthorName = useMemo(() => {
    if (!authorId) return 'All Authors';
    const author = authors.find((a) => a.id === authorId);
    return author?.display_name || 'Unknown Author';
  }, [authorId, authors]);

  return (
    <Box
      className="comment-filter-panel"
      bg="gray.50"
      p={4}
      rounded="md"
      mb={6}
      display={{ base: 'block', md: 'block' }}
    >
      {/* Content Type Filter */}
      <VStack align="stretch" spacing={4}>
        <Box>
          <Text fontSize="sm" fontWeight="600" mb={2} className="text-gray-700">
            Content Type
          </Text>
          <HStack spacing={2} wrap="wrap">
            <Button
              size="sm"
              variant={contentType === 'all' ? 'solid' : 'outline'}
              colorScheme={contentType === 'all' ? 'blue' : 'gray'}
              onClick={() => handleContentTypeChange('all')}
              aria-pressed={contentType === 'all'}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={contentType === 'event' ? 'solid' : 'outline'}
              colorScheme={contentType === 'event' ? 'blue' : 'gray'}
              onClick={() => handleContentTypeChange('event')}
              aria-pressed={contentType === 'event'}
            >
              Events
            </Button>
            <Button
              size="sm"
              variant={contentType === 'wishlist' ? 'solid' : 'outline'}
              colorScheme={contentType === 'wishlist' ? 'blue' : 'gray'}
              onClick={() => handleContentTypeChange('wishlist')}
              aria-pressed={contentType === 'wishlist'}
            >
              Wishlist
            </Button>
          </HStack>
        </Box>

        {/* Author Filter */}
        <Box>
          <Text fontSize="sm" fontWeight="600" mb={2} className="text-gray-700">
            Author
          </Text>
          <Select
            size="sm"
            value={authorId || ''}
            onChange={handleAuthorChange}
            aria-label="Filter by author"
            placeholder="All Authors"
            maxW="200px"
          >
            <option value="">All Authors</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.display_name || 'Unknown'}
              </option>
            ))}
          </Select>
        </Box>

        {/* Sort Options */}
        <Box>
          <Text fontSize="sm" fontWeight="600" mb={2} className="text-gray-700">
            Sort By
          </Text>
          <HStack spacing={2} wrap="wrap">
            <Button
              size="sm"
              variant={sortBy === 'newest' ? 'solid' : 'outline'}
              colorScheme={sortBy === 'newest' ? 'blue' : 'gray'}
              onClick={() => handleSortChange('newest')}
              aria-pressed={sortBy === 'newest'}
            >
              Newest First
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'oldest' ? 'solid' : 'outline'}
              colorScheme={sortBy === 'oldest' ? 'blue' : 'gray'}
              onClick={() => handleSortChange('oldest')}
              aria-pressed={sortBy === 'oldest'}
            >
              Oldest First
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'author' ? 'solid' : 'outline'}
              colorScheme={sortBy === 'author' ? 'blue' : 'gray'}
              onClick={() => handleSortChange('author')}
              aria-pressed={sortBy === 'author'}
            >
              Author (A-Z)
            </Button>
          </HStack>
        </Box>

        {/* Clear Filters Button */}
        {(contentType !== 'all' || authorId !== null || sortBy !== 'newest') && (
          <Button
            size="sm"
            variant="ghost"
            colorScheme="gray"
            onClick={handleClearFilters}
            className="text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </Button>
        )}
      </VStack>
    </Box>
  );
}
