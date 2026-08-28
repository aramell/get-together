'use client';

import React, { useState } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  RadioGroup,
  Radio,
  Stack,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { updateGroupSettings } from '@/lib/services/groupService';

export type PlanningStyle = 'availability-first' | 'proposals-first';

interface PlanningStyleSettingProps {
  groupId: string;
  planningStyle: PlanningStyle;
  isAdmin: boolean;
  onChanged?: (planningStyle: PlanningStyle) => void;
}

const STYLE_LABELS: Record<PlanningStyle, string> = {
  'availability-first': 'Availability-first',
  'proposals-first': 'Proposals-first',
};

const STYLE_DESCRIPTIONS: Record<PlanningStyle, string> = {
  'availability-first':
    "Members land on a shared availability view showing who's free, so plans come from what's possible before anyone has to propose anything.",
  'proposals-first':
    'Members land on the event feed. Propose an event and watch your friends respond in real-time with one tap — the original get-together flow.',
};

/**
 * PlanningStyleSetting Component (Story 2.8 / FR71)
 * Displays the group's Planning Style. Admins can change it; members see a
 * read-only view, consistent with other admin-only group settings.
 */
export const PlanningStyleSetting: React.FC<PlanningStyleSettingProps> = ({
  groupId,
  planningStyle,
  isAdmin,
  onChanged,
}) => {
  const toast = useToast();
  const [currentStyle, setCurrentStyle] = useState<PlanningStyle>(planningStyle);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (value: string) => {
    const nextStyle = value as PlanningStyle;
    if (nextStyle === currentStyle) return;

    const previousStyle = currentStyle;
    setCurrentStyle(nextStyle);
    setIsSaving(true);

    try {
      const result = await updateGroupSettings(groupId, { planning_style: nextStyle });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update Planning Style');
      }

      toast({
        title: 'Planning Style updated',
        description: `This group now defaults to ${STYLE_LABELS[nextStyle]}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      onChanged?.(nextStyle);
    } catch {
      setCurrentStyle(previousStyle);
      toast({
        title: 'Error',
        description: 'Failed to update Planning Style',
        status: 'error',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" p={{ base: '6', md: '8' }} bg="white">
      <VStack align="stretch" spacing={4}>
        <Box>
          <Heading size="md" mb={2}>
            Planning Style
          </Heading>
          <Text color="gray.600" fontSize="sm">
            Determines what this group lands on by default when a member opens the app.
          </Text>
        </Box>

        {isAdmin ? (
          <RadioGroup
            value={currentStyle}
            onChange={handleChange}
            isDisabled={isSaving}
            aria-label="Planning Style"
          >
            <Stack spacing={4}>
              {(Object.keys(STYLE_LABELS) as PlanningStyle[]).map((style) => (
                <Box key={style}>
                  <Radio value={style} aria-label={STYLE_LABELS[style]}>
                    <Text fontWeight="semibold">{STYLE_LABELS[style]}</Text>
                  </Radio>
                  <Text fontSize="xs" color="gray.500" ml={6}>
                    {STYLE_DESCRIPTIONS[style]}
                  </Text>
                </Box>
              ))}
            </Stack>
          </RadioGroup>
        ) : (
          <Box>
            <Badge colorScheme="purple" fontSize="sm" px={2} py={1} data-testid="planning-style-readonly">
              {STYLE_LABELS[currentStyle]}
            </Badge>
            <Text fontSize="xs" color="gray.500" mt={2}>
              {STYLE_DESCRIPTIONS[currentStyle]}
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              Only group admins can change this setting.
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default PlanningStyleSetting;
