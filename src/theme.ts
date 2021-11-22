import { extendTheme } from '@chakra-ui/react';
import { StepsStyleConfig as Steps } from 'chakra-ui-steps';

export const theme = extendTheme({
  components: {
    Steps,
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
        color: '#149dcc',
      },
    },
  },
});
