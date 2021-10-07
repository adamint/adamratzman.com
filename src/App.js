import React from 'react';
import { Navbar } from './components/nav/Navbar';
import { Box, Flex, Spacer } from '@chakra-ui/react';
import { Footer } from './components/nav/Footer';
import { Route, Switch } from 'react-router-dom';
import { HomeRoute } from './components/routes/HomeRoute';
import './App.css';
import { PortfolioRoute } from './components/routes/PortfolioRoute';
import { ContactRoute } from './components/routes/ContactRoute';
import { ProjectsRoute } from './components/routes/projects/ProjectsRoute';
import { NotFoundRoute } from './components/routes/NotFoundRoute';

function App() {
  return <>
    <Flex direction='column' minH='100vh'>
      <Navbar />

      <Box mx='auto' mt='40px' w={['95%', '85%', '66%']}>
        <Switch>
          <Route exact path='/'>
            <HomeRoute />
          </Route>
          <Route exact path="/portfolio">
            <PortfolioRoute />
          </Route>
          <Route exact path="/contact">
            <ContactRoute />
          </Route>
          <Route path="/projects">
            <ProjectsRoute />
          </Route>
          <Route>
            <NotFoundRoute goBackPath={{name: "the homepage", path: "/"}} />
          </Route>
        </Switch>
      </Box>

      <Spacer />
      <Footer />
    </Flex>
  </>;
}

export default App;
