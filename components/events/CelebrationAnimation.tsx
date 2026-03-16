'use client';

import { Box, keyframes } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface CelebrationAnimationProps {
  isActive: boolean;
  duration?: number; // milliseconds
}

// Define animations
const glow = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
`;

export function CelebrationAnimation({
  isActive,
  duration = 2000,
}: CelebrationAnimationProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShouldAnimate(true);
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!shouldAnimate) {
    return null;
  }

  return (
    <Box
      position="fixed"
      inset={0}
      pointerEvents="none"
      zIndex={50}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      {/* Green glow effect */}
      <Box
        width="300px"
        height="300px"
        borderRadius="full"
        bg="green.400"
        opacity={0.3}
        animation={`${glow} ${duration}ms ease-out`}
      />

      {/* Pulsing center dot */}
      <Box
        position="absolute"
        width="100px"
        height="100px"
        borderRadius="full"
        bg="green.500"
        opacity={0.4}
        animation={`${pulse} ${duration}ms ease-in-out`}
      />

      {/* Confetti-like particles */}
      {[...Array(12)].map((_, i) => (
        <ConfettiPiece key={i} index={i} duration={duration} />
      ))}
    </Box>
  );
}

interface ConfettiPieceProps {
  index: number;
  duration: number;
}

function ConfettiPiece({ index, duration }: ConfettiPieceProps) {
  const angle = (index / 12) * 360;
  const distance = 200;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;

  const fall = keyframes`
    0% {
      transform: translate(0, 0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translate(${x}px, ${y}px) rotate(720deg);
      opacity: 0;
    }
  `;

  const colors = ['green.400', 'green.300', 'emerald.400', 'teal.400'];
  const color = colors[index % colors.length];

  return (
    <Box
      position="absolute"
      width="12px"
      height="12px"
      borderRadius="full"
      bg={color}
      top="50%"
      left="50%"
      mt="-6px"
      ml="-6px"
      animation={`${fall} ${duration}ms ease-out forwards`}
    />
  );
}
