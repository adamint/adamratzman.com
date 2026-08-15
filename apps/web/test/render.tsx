import React, { StrictMode } from 'react';
import { render } from '@testing-library/react';
import {
  createMemoryRouter,
  RouterProvider,
  type RouteObject,
} from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { RouterLoadingFallback } from '../src/router';

type RenderWithRouterOptions = {
  initialEntries?: string[];
  initialIndex?: number;
};

export function renderWithRouter(
  routes: RouteObject[],
  {
    initialEntries = ['/'],
    initialIndex = 0,
  }: RenderWithRouterOptions = {},
) {
  const routesWithFallback = routes.map((route, index) => (
    index === 0 && !route.HydrateFallback
      ? { ...route, HydrateFallback: RouterLoadingFallback }
      : route
  ));
  const router = createMemoryRouter(routesWithFallback, {
    initialEntries,
    initialIndex,
  });

  return {
    router,
    ...render(
      <StrictMode>
        <HelmetProvider>
          <RouterProvider router={router} />
        </HelmetProvider>
      </StrictMode>,
    ),
  };
}
