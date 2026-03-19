'use client';

import { Box, Input, Button, HStack, Text, useDebounceValue } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface CommentSearchBoxProps {
  onSearch: (query: string | null) => void;
  resultCount?: number;
}

/**
 * CommentSearchBox: Debounced search input for filtering comments
 * Debounces input by 300ms to avoid excessive API calls
 * Shows result count when search is active
 */
export function CommentSearchBox({ onSearch, resultCount = 0 }: CommentSearchBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const debouncedValue = useDebounceValue(inputValue, 300);

  useEffect(() => {
    const query = debouncedValue.trim();
    onSearch(query ? query : null);
  }, [debouncedValue, onSearch]);

  const handleClear = () => {
    setInputValue('');
  };

  return (
    <Box mb={6}>
      <HStack spacing={3}>
        <Input
          placeholder="Search comments by content, author, or target..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          aria-label="Search comments"
          aria-describedby="search-hint"
          size="md"
          rounded="md"
          borderWidth="1px"
          borderColor="gray.300"
          _focus={{
            borderColor: 'blue.500',
            boxShadow: '0 0 0 1px rgba(66, 153, 225, 0.5)',
          }}
        />
        {inputValue && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleClear}
            aria-label="Clear search"
            className="text-gray-600 hover:text-gray-900"
          >
            Clear
          </Button>
        )}
      </HStack>

      {/* Search hint and result count */}
      <Text id="search-hint" fontSize="xs" color="gray.500" mt={2}>
        {inputValue ? (
          <>
            Found <strong>{resultCount}</strong> comment{resultCount !== 1 ? 's' : ''} matching &quot;
            {inputValue}&quot;
          </>
        ) : (
          'Search by comment text, author name, or event/item title'
        )}
      </Text>
    </Box>
  );
}
