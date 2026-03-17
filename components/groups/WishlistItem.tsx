'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Box, Text, Link, HStack, VStack, Avatar, Badge } from '@chakra-ui/react';

interface WishlistItemProps {
  id: string;
  title: string;
  description: string | null;
  link: string | null;
  creator_name?: string;
  creator_email?: string;
  created_at: string;
  onClick?: () => void;
  isNew?: boolean;
  interest_count?: number;
  user_is_interested?: boolean;
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
  isNew = false,
  interest_count = 0,
  user_is_interested = false,
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
      borderColor={isNew ? 'green.300' : 'gray.200'}
      bg={isNew ? 'green.50' : 'white'}
      _hover={{ shadow: 'md', bg: isNew ? 'green.100' : 'gray.50' }}
      transition="all 0.3s"
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`Wishlist item: ${title}${isNew ? ' (newly added)' : ''}`}
    >
      <VStack align="stretch" spacing={3}>
        {/* Header with title and creator */}
        <HStack justify="space-between" spacing={4}>
          <Text fontSize="lg" fontWeight="600" noOfLines={1} flex={1}>
            {title}
          </Text>
          <Avatar
            size="md"
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
              onKeyDown={(e) => {
                if (description && description.length > 100 && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
              cursor={description && description.length > 100 ? 'pointer' : undefined}
              role={description && description.length > 100 ? 'button' : undefined}
              tabIndex={description && description.length > 100 ? 0 : undefined}
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                  }
                }}
                role="button"
                tabIndex={0}
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
            minH="48px"
            display="flex"
            alignItems="center"
          >
            {link.replace(/^https?:\/\//, '').split('/')[0]}
          </Link>
        )}

        {/* Interest Count */}
        <HStack spacing={2}>
          <Badge
            colorScheme={user_is_interested ? 'green' : 'purple'}
            variant="subtle"
          >
            {interest_count} interested
          </Badge>
          {user_is_interested && (
            <Badge colorScheme="green" variant="solid" fontSize="xs">
              You're interested
            </Badge>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
