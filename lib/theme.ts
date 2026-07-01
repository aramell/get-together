import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

/**
 * "Corkboard" theme.
 *
 * The product's real mechanic is plans going from soft to solid: people mark
 * loose availability, momentum builds, and once a threshold is crossed the
 * event locks in (see EventCard / MomentumCounter / ConfirmationBadge /
 * CelebrationAnimation). The visual language mirrors that directly — a
 * pending plan reads like a note pinned to a corkboard (tan mat, slight
 * rotation, dashed edge); a confirmed one reads like it's been stamped and
 * pressed flat.
 *
 * Palette (named, not just hex):
 *  - paper    #FBF6EE  page background, warm parchment
 *  - ink      #2A2140  primary text, plum-black rather than pure black
 *  - cork     #C07C3C  pending / pinned state, corkboard tan
 *  - coral    #FF5A4E  primary action, "I'm in"
 *  - marigold #FFB238  momentum / in-progress
 *  - meadow   #2E9E6B  confirmed / success
 */

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: 'var(--font-fredoka), sans-serif',
    body: 'var(--font-karla), sans-serif',
    mono: 'var(--font-space-mono), monospace',
  },
  colors: {
    ink: {
      50: '#F1EEF5',
      100: '#DCD5E6',
      200: '#BCAFD0',
      300: '#9885B8',
      400: '#7A67A0',
      500: '#5C4B84',
      600: '#473A67',
      700: '#362C4F',
      800: '#2A2140',
      900: '#1B1329',
    },
    paper: {
      50: '#FFFDFA',
      100: '#FDF9F1',
      200: '#FBF6EE',
      300: '#F5EEDF',
      400: '#EFE6CF',
      500: '#E8DCBC',
      600: '#D8C7A0',
      700: '#B9A47D',
      800: '#8F7D5D',
      900: '#5E5138',
    },
    cork: {
      50: '#FBF3EA',
      100: '#F5E4CE',
      200: '#E9C79E',
      300: '#DCAB74',
      400: '#CE924F',
      500: '#C07C3C',
      600: '#9C6430',
      700: '#784D25',
      800: '#55371A',
      900: '#33210F',
    },
    coral: {
      50: '#FFF1EF',
      100: '#FFE1DD',
      200: '#FFC1B9',
      300: '#FF9C90',
      400: '#FF7A6B',
      500: '#FF5A4E',
      600: '#E8433A',
      700: '#C13129',
      800: '#99251F',
      900: '#6E1913',
    },
    marigold: {
      50: '#FFF8EC',
      100: '#FFEDC9',
      200: '#FFDC94',
      300: '#FFC761',
      400: '#FFB93F',
      500: '#FFB238',
      600: '#E89620',
      700: '#C17812',
      800: '#955C0D',
      900: '#6B4109',
    },
    meadow: {
      50: '#EAF7F1',
      100: '#CBEBDD',
      200: '#9DD9BE',
      300: '#6BC49E',
      400: '#46AF84',
      500: '#2E9E6B',
      600: '#22815A',
      700: '#1A6647',
      800: '#144C35',
      900: '#0D3323',
    },
  },
  radii: {
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1.125rem',
    '2xl': '1.5rem',
  },
  styles: {
    global: {
      body: {
        bg: 'paper.200',
        color: 'ink.800',
      },
      '::selection': {
        bg: 'coral.200',
        color: 'ink.900',
      },
      ':focus-visible': {
        outline: '2px solid',
        outlineColor: 'coral.500',
        outlineOffset: '2px',
      },
    },
  },
  components: {
    Heading: {
      baseStyle: {
        color: 'ink.800',
      },
    },
    Button: {
      baseStyle: {
        fontWeight: '700',
        borderRadius: 'full',
      },
      defaultProps: {
        colorScheme: 'coral',
      },
    },
    Badge: {
      baseStyle: {
        fontFamily: 'var(--font-space-mono), monospace',
        borderRadius: 'full',
        fontWeight: '700',
        letterSpacing: '0.02em',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: 'xl',
          borderWidth: '1px',
          borderColor: 'cork.100',
          boxShadow: '0 2px 0 0 var(--chakra-colors-cork-100)',
        },
      },
    },
    Progress: {
      baseStyle: {
        track: {
          bg: 'cork.100',
          borderRadius: 'full',
        },
        filledTrack: {
          borderRadius: 'full',
        },
      },
    },
  },
});

export default theme;
