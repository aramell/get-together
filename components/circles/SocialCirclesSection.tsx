'use client';

import React, { useEffect, useState } from 'react';
import { Box, Heading, HStack, Badge, useDisclosure } from '@chakra-ui/react';
import { CreateCircleModal } from './CreateCircleModal';
import { CircleList, type CircleSummary } from './CircleList';
import { CircleDetail } from './CircleDetail';

/**
 * Social Circles section of the profile page: list + count badge (AC7),
 * create modal (Story 10.1), and detail modal (Story 10.3, AC3-AC6).
 */
export const SocialCirclesSection: React.FC = () => {
  const { isOpen: isCreateOpen, onOpen: onOpenCreate, onClose: onCloseCreate } = useDisclosure();
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCircleId, setActiveCircleId] = useState<string | null>(null);

  useEffect(() => {
    const loadCircles = async () => {
      try {
        const response = await fetch('/api/circles');
        const result = await response.json();
        if (result.success) {
          setCircles(result.data);
        }
      } catch (error) {
        console.error('Error loading social circles:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCircles();
  }, []);

  const handleCreated = (circle: CircleSummary) => {
    setCircles((prev) => [circle, ...prev]);
  };

  const handleCircleUpdated = (updated: { id: string; name: string; updatedAt: string }) => {
    setCircles((prev) => prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name } : c)));
  };

  const handleCircleDeleted = (circleId: string) => {
    setCircles((prev) => prev.filter((c) => c.id !== circleId));
    setActiveCircleId(null);
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={{ base: '6', md: '8' }} bg="white">
      <HStack mb={4} spacing={2}>
        <Heading size="md">Social Circles</Heading>
        {!loading && (
          <Badge colorScheme="teal" borderRadius="full" px={2}>
            {circles.length} {circles.length === 1 ? 'circle' : 'circles'}
          </Badge>
        )}
      </HStack>

      <CircleList
        circles={circles}
        loading={loading}
        onCreateClick={onOpenCreate}
        onCircleClick={setActiveCircleId}
      />

      <CreateCircleModal isOpen={isCreateOpen} onClose={onCloseCreate} onSuccess={handleCreated} />

      {activeCircleId && (
        <CircleDetail
          circleId={activeCircleId}
          isOpen={!!activeCircleId}
          onClose={() => setActiveCircleId(null)}
          onCircleUpdated={handleCircleUpdated}
          onCircleDeleted={handleCircleDeleted}
        />
      )}
    </Box>
  );
};

export default SocialCirclesSection;
