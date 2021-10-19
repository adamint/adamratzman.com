import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { theme } from './theme';
import { BrowserRouter } from 'react-router-dom';

import ReactGA from 'react-ga';

ReactGA.initialize('UA-210593602-1');
ReactGA.pageview(window.location.pathname + window.location.search);

ReactDOM.render(
  <StrictMode>
    <ColorModeScript />
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
  document.getElementById('root'),
);
