import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';
import { Link, LinkProps } from '@chakra-ui/react';
import React from 'react';

type ChakraRouterLinkProps = {
  children: React.ReactNode;
  to: string;
}

export function ChakraRouterLink({children, to, ...rest} : ChakraRouterLinkProps & LinkProps & RouterLinkProps) {
  if (to.startsWith("/")) return <Link as={RouterLink} to={to} color="#149dcc" {...rest}>{children}</Link>
  else return <Link href={to} color="#149dcc" {...rest}>{children}</Link>
}