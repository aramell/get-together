'use client';

import { HStack, Button, Text, Input, Box } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * PaginationControls: Navigation for paginated comment lists
 * Supports: Previous/Next buttons, page indicator, direct page input
 */
export function PaginationControls({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
}: PaginationControlsProps) {
  const [inputPage, setInputPage] = useState(currentPage.toString());

  // Update input when currentPage changes
  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(inputPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputPage(currentPage.toString());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage();
    }
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <Box className="pagination-controls" mt={6} pt={4} borderTopWidth="1px" borderColor="gray.200">
      <HStack justify="space-between" wrap="wrap" spacing={4}>
        {/* Previous/Next Buttons */}
        <HStack spacing={2}>
          <Button
            size="sm"
            isDisabled={currentPage === 1}
            onClick={handlePrevious}
            aria-label="Previous page"
          >
            ← Previous
          </Button>
          <Button
            size="sm"
            isDisabled={currentPage === totalPages}
            onClick={handleNext}
            aria-label="Next page"
          >
            Next →
          </Button>
        </HStack>

        {/* Page Indicator */}
        <Text fontSize="sm" className="text-gray-600" whiteSpace="nowrap">
          Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({startItem}-{endItem} of{' '}
          <strong>{totalCount}</strong> comments)
        </Text>

        {/* Go to Page Input */}
        {totalPages > 1 && (
          <HStack spacing={2}>
            <Text fontSize="sm" className="text-gray-600">
              Go to:
            </Text>
            <Input
              type="number"
              min="1"
              max={totalPages}
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyPress={handleKeyPress}
              onBlur={handleGoToPage}
              size="sm"
              width="60px"
              aria-label="Page number input"
            />
          </HStack>
        )}
      </HStack>
    </Box>
  );
}
