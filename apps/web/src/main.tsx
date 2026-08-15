import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider } from 'react-router-dom';
import { createAppRouter } from './router';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Unable to start the web app because #root was not found in index.html.');
}

const router = createAppRouter();

createRoot(rootElement).render(
  <StrictMode>
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  </StrictMode>,
);
