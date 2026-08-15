import type { PropsWithChildren } from 'react';
import { Helmet } from 'react-helmet-async';

export default function Head({ children }: PropsWithChildren) {
  return <Helmet>{children}</Helmet>;
}
