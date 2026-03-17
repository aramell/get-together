'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Box, Text, Link, HStack, VStack, Avatar } from '@chakra-ui/react';

interface WishlistItemProps {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  creator_name?: string;
  creator_email?: string;
  created_at: string;
  onClick?: () => void;
}

export function WishlistItem({
  id,
  title,
  description,
  link,
  creator_name,
  creator_email,
  created_at,
  onClick,
}: WishlistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Truncate description to 100 characters
  const displayDescription = description
    ? description.length > 100
      ? `${description.substring(0, 100)}...`
      : description
    : null;

  const formattedDate = format(new Date(created_at), 'MMM d, yyyy');
  const initials = creator_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      bg="white"
      _hover={{ shadow: 'md', bg: 'gray.50' }}
      transition="all 0.2s"
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`Wishlist item: ${title}`}
    >
      <VStack align="stretch" spacing={3}>
        {/* Header with title and creator */}
        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="600" noOfLines={1}>
            {title}
          </Text>
          <Avatar
            size="sm"
            name={creator_name || creator_email || 'Unknown'}
            getInitials={() => initials}
            title={`${creator_name || creator_email}`}
          />
        </HStack>

        {/* Creator and date info */}
        <HStack spacing={2} fontSize="sm" color="gray.600">
          <Text>{creator_name || creator_email || 'Unknown'}</Text>
          <Text>•</Text>
          <Text>{formattedDate}</Text>
        </HStack>

        {/* Description */}
        {displayDescription && (
          <Box>
            <Text
              fontSize="sm"
              color="gray.700"
              onClick={() => setIsExpanded(!isExpanded)}
              cursor={description && description.length > 100 ? 'pointer' : undefined}
            >
              {isExpanded ? description : displayDescription}
            </Text>
            {description && description.length > 100 && (
              <Text
                fontSize="xs"
                color="blue.500"
                cursor="pointer"
                mt={1}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Text>
            )}
          </Box>
        )}

        {/* Link */}
        {link && (
          <Link
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            color="blue.500"
            fontSize="sm"
            isExternal
          >
            {link.replace(/^https?:\/\//, '').split('/')[0]}
          </Link>
        )}
      </VStack>
    </Box>
  );
}
