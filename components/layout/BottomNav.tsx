'use client';

import React from 'react';
import { Box, HStack, Button, Text, useBreakpointValue } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { FiUsers, FiGift } from 'react-icons/fi';

interface BottomNavProps {
  userId?: string;
}

const TABS = [
  { path: '/groups', label: 'Groups', icon: FiUsers },
  { path: '/wishlist', label: 'Wishlist', icon: FiGift },
];

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
      bg="paper.100"
      borderTop="1px solid"
      borderColor="cork.200"
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
        {TABS.map(({ path, label, icon: Icon }) => {
          const active = isActive(path);
          return (
            <Button
              key={path}
              onClick={() => router.push(path)}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              height="56px"
              minHeight="56px"
              width="100%"
              maxWidth="none"
              bg="transparent"
              color={active ? 'coral.600' : 'ink.500'}
              borderRadius={0}
              border="none"
              _hover={{ bg: 'cork.50' }}
              _focus={{
                outline: '2px solid',
                outlineColor: 'coral.500',
                outlineOffset: '0px',
              }}
              gap={1}
              py={0}
              px={2}
            >
              <Icon size={22} />
              <Text
                fontSize="xs"
                fontWeight={active ? '700' : '500'}
                whiteSpace="nowrap"
              >
                {label}
              </Text>
              {/* Pin dot — echoes the corkboard motif; only the active tab is "pinned" */}
              <Box
                width="4px"
                height="4px"
                borderRadius="full"
                bg={active ? 'coral.500' : 'transparent'}
              />
            </Button>
          );
        })}
      </HStack>
    </Box>
  );
}

export default BottomNav;
