import {
  Link as ChakraLink,
  type LinkProps as ChakraLinkProps,
} from '@chakra-ui/react';
import { forwardRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

type ChakraRouterLinkProps = {
  href: string;
} & Omit<ChakraLinkProps, 'as' | 'href'>;

export const ChakraRouterLink = forwardRef<HTMLAnchorElement, ChakraRouterLinkProps>(
  ({ href, ...rest }, ref) => {
    if (href.startsWith('/') && !href.startsWith('//')) {
      return (
        <ChakraLink
          as={RouterLink}
          color="#149dcc"
          ref={ref}
          to={href}
          {...rest}
        />
      );
    }

    return <ChakraLink color="#149dcc" href={href} ref={ref} {...rest} />;
  },
);

ChakraRouterLink.displayName = 'ChakraRouterLink';