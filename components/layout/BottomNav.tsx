'use client';

import React from 'react';
import { Box, HStack, Button, Text, useBreakpointValue } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { FiHome, FiGift, FiUsers } from 'react-icons/fi';

interface BottomNavProps {
  userId?: string;
}

export function BottomNav({ userId }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const showNav = useBreakpointValue({ base: true, md: false });

  if (!showNav) return null;

  const isActive = (path: string) => pathname?.startsWith(path) || false;

  return (
    <Box
      position="sticky"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      zIndex={40}
      height={{ base: '56px', sm: '56px' }}
      minHeight="56px"
    >
      <HStack
        height="100%"
        justify="space-around"
        spacing={0}
        px={0}
        py={0}
        width="100%"
      >
        {/* Get-Together Tab */}
        <Button
          onClick={() => router.push('/groups')}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="56px"
          minHeight="56px"
          width="100%"
          maxWidth="none"
          bg={isActive('/groups') ? 'blue.50' : 'transparent'}
          borderRadius={0}
          border="none"
          _hover={{ bg: 'gray.50' }}
          _focus={{
            outline: '2px solid',
            outlineColor: 'blue.500',
            outlineOffset: '0px',
          }}
          gap={1}
          py={0}
          px={2}
        >
          <FiHome size={24} />
          <Text fontSize="xs" fontWeight="medium" whiteSpace="nowrap">
            Get-Together
          </Text>
        </Button>

        {/* Wishlist Tab */}
        <Button
          onClick={() => router.push('/wishlist')}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="56px"
          minHeight="56px"
          width="100%"
          maxWidth="none"
          bg={isActive('/wishlist') ? 'blue.50' : 'transparent'}
          borderRadius={0}
          border="none"
          _hover={{ bg: 'gray.50' }}
          _focus={{
            outline: '2px solid',
            outlineColor: 'blue.500',
            outlineOffset: '0px',
          }}
          gap={1}
          py={0}
          px={2}
        >
          <FiGift size={24} />
          <Text fontSize="xs" fontWeight="medium" whiteSpace="nowrap">
            Wishlist
          </Text>
        </Button>

        {/* Groups Tab */}
        <Button
          onClick={() => router.push('/groups')}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          height="56px"
          minHeight="56px"
          width="100%"
          maxWidth="none"
          bg={isActive('/groups') && !isActive('/groups/') ? 'blue.50' : 'transparent'}
          borderRadius={0}
          border="none"
          _hover={{ bg: 'gray.50' }}
          _focus={{
            outline: '2px solid',
            outlineColor: 'blue.500',
            outlineOffset: '0px',
          }}
          gap={1}
          py={0}
          px={2}
        >
          <FiUsers size={24} />
          <Text fontSize="xs" fontWeight="medium" whiteSpace="nowrap">
            Groups
          </Text>
        </Button>
      </HStack>
    </Box>
  );
}

export default BottomNav;
