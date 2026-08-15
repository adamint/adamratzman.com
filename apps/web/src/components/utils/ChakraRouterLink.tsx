import Link, { LinkProps } from 'next/link';
import { Link as ChakraLink, LinkProps as ChakraLinkProps } from '@chakra-ui/react';
import React from 'react';

type ChakraRouterLinkProps = {
  children: React.ReactNode;
  href: string;
}

export function ChakraRouterLink({
                                   children,
                                   href,
                                   ...rest
                                 }: ChakraRouterLinkProps & ChakraLinkProps & React.PropsWithChildren<LinkProps>) {
  if (href.startsWith('/')) return <ChakraLink as={Link} href={href} color='#149dcc' {...rest}>{children}</ChakraLink>
  else return <ChakraLink href={href} color='#149dcc' {...rest}>{children}</ChakraLink>;
}