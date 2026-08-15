import { extendTheme, type ColorModeWithSystem } from '@chakra-ui/react';
import { StepsTheme } from 'chakra-ui-steps';

export const colorModeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: false,
} satisfies {
  initialColorMode: ColorModeWithSystem;
  useSystemColorMode: boolean;
};

export const theme = extendTheme({
  config: colorModeConfig,
  semanticTokens: {
    colors: {
      link: {
        default: 'blue.700',
        _dark: 'blue.200',
      },
      focusRing: {
        default: 'orange.600',
        _dark: 'orange.300',
      },
    },
  },
  components: {
    StepsTheme,
    Heading: {
      baseStyle: {
        fontWeight: 500,
      },

      sizes: {
        mdx: {
          fontSize: '1.5rem',
        },
      },
      variants: {
        light: {
          fontWeight: 300,
        },
        semiLight: {
          fontWeight: 400,
        },
        bold: {
          fontWeight: 500,
        },
        superBold: {
          fontWeight: 700,
        },
      },
    },
    Text: {
      baseStyle: {
        fontSize: '1.2rem',
      },
      sizes: {
        mdx: {
          fontSize: '1.5rem',
        },
      },
      variants: {
        light: {
          fontWeight: 300,
        },
        semiLight: {
          fontWeight: 400,
        },
        bold: {
          fontWeight: 500,
        },
        superBold: {
          fontWeight: 700,
        },
      },
    },
    Box: {
      variants: {
        dashed: {
          borderBottom: '1px dashed black',
        },
      },
    },
    Link: {
      baseStyle: {
        color: 'link',
        textDecoration: 'underline',
        textUnderlineOffset: '0.15em',
        _focusVisible: {
          borderRadius: 'sm',
          boxShadow: 'outline',
          outline: '2px solid',
          outlineColor: 'focusRing',
          outlineOffset: '2px',
        },
      },
      variants: {
        navigation: {
          textDecoration: 'none',
          _hover: {
            textDecoration: 'none',
          },
        },
        media: {
          display: 'inline-block',
          lineHeight: 0,
          textDecoration: 'none',
          _hover: {
            textDecoration: 'none',
          },
        },
      },
    },
  },
});
