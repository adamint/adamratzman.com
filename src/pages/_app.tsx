import React from 'react';
import { Navbar } from '../components/nav/Navbar';
import { Box, ChakraProvider, ColorModeScript, Flex, Spacer } from '@chakra-ui/react';
import { Footer } from '../components/nav/Footer';
import { theme } from '../theme';
import { AppProps } from 'next/app';
import Head from 'next/head';

function App({ Component, pageProps }: AppProps) {
  return <>
    <Head>
      <title>Adam Ratzman | adamratzman.com</title>
    </Head>
    <ColorModeScript />
    <ChakraProvider theme={theme}>
      <Flex direction='column' minH='100vh'>
        <Navbar />

        <Box mx='auto' mt='40px' w={['90%', '85%', '66%']}>
          <Component {...pageProps} />
        </Box>

        <Spacer />
        <Footer />
      </Flex>
    </ChakraProvider>
  </>;
}

export default App;
