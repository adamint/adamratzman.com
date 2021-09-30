import React from 'react';
import { Navbar } from './components/nav/Navbar';
import { Box, Flex, Spacer } from '@chakra-ui/react';
import { Footer } from './components/nav/Footer';
import { Route, Switch } from 'react-router-dom';
import { HomeRoute } from './components/home/HomeRoute';

function App() {
  return <>
    <Flex direction='column' minH='100vh'>
      <Navbar />

      <Box mx="auto" mt="40px" w={["100%", "85%", "66%"]}>
        <Switch>
          <Route exact path="/">
            <HomeRoute />
          </Route>
        </Switch>
      </Box>

      <Spacer />
      <Footer />
    </Flex>
  </>;
}

export default App;
