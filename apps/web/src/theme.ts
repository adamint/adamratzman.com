import { extendTheme } from '@chakra-ui/react';
import { StepsTheme } from 'chakra-ui-steps';

export const theme = extendTheme({
  semanticTokens: {
    colors: {
      link: {
        default: 'blue.700',
        _dark: 'blue.200',
      },
    },
  },
  styles: {
    global: {
      '.chakra-link[href]:not([data-navigation-link]):not([data-skip-link])': {
        color: 'link !important',
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
          outlineColor: 'orange.400',
          outlineOffset: '2px',
        },
      },
    },
  },
});
