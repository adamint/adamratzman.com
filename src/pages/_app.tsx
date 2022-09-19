import React from 'react';
import { Navbar } from '../components/nav/Navbar';
import {
  Box,
  Button,
  ChakraProvider,
  ColorModeScript,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  Spacer,
  Text,
} from '@chakra-ui/react';
import { Footer } from '../components/nav/Footer';
import { theme } from '../theme';
import { AppProps } from 'next/app';
import Head from 'next/head';
import { ConsoleComponent } from '../components/nav/ConsoleComponent';

function App({ Component, pageProps }: AppProps) {
  return <>
    <Head>
      <title>Adam Ratzman | adamratzman.com</title>
    </Head>
    <ColorModeScript initialColorMode="system" />
    <ChakraProvider theme={theme}>
      <Flex direction='column' minH='100vh'>
        <Navbar />

        <Box mx='auto' mt='40px' w={['90%', '85%', '66%']}>
          <Component {...pageProps} />
        </Box>

        <Spacer />
        <Footer />
      </Flex>

      <ConsoleComponent />
    </ChakraProvider>;
  </>
    ;
}

export default App;
