import type { ComponentType } from 'react';

export type AppProps<TPageProps = Record<string, unknown>> = {
  Component: ComponentType<TPageProps>;
  pageProps: TPageProps;
};
