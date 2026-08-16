import { Box, ChakraProvider, ColorModeScript, Flex, Spacer } from '@chakra-ui/react';
import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';
import { ConsoleComponent } from './components/nav/ConsoleComponent';
import { Footer } from './components/nav/Footer';
import { Navbar } from './components/nav/Navbar';
import { SkipToContentLink } from './components/nav/SkipToContentLink';
import { RouteFocusManager } from './components/routing/RouteFocusManager';
import { colorModeConfig, theme } from './theme';

export function AppShell() {
  return (
    <>
      <Helmet>
        <title>Adam Ratzman | adamratzman.com</title>
      </Helmet>
      <ColorModeScript initialColorMode={colorModeConfig.initialColorMode} />
      <ChakraProvider theme={theme}>
        <RouteFocusManager />
        <Flex direction="column" minH="100vh">
          <SkipToContentLink />
          <Box as="header">
            <Navbar />
          </Box>
          <Box aria-label="Main content" as="main" id="main-content" mx="auto" mt="30px" tabIndex={-1} w={['90%', '85%', '66%']}>
            <Outlet />
          </Box>
          <Spacer />
          <Box as="footer">
            <Footer />
          </Box>
        </Flex>
        <ConsoleComponent />
      </ChakraProvider>
    </>
  );
}
