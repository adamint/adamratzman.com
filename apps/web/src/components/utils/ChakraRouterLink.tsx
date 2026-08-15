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
  ({ href, rel, target, ...rest }, ref) => {
    if (href.startsWith('/') && !href.startsWith('//')) {
      return (
        <ChakraLink
          as={RouterLink}
          color="#149dcc"
          ref={ref}
          rel={rel}
          target={target}
          to={href}
          {...rest}
        />
      );
    }

    const safeRel = target === '_blank'
      ? mergeRelTokens(rel, ['noopener', 'noreferrer'])
      : rel;

    return <ChakraLink
      color="#149dcc"
      href={href}
      ref={ref}
      rel={safeRel}
      target={target}
      {...rest}
    />;
  },
);

ChakraRouterLink.displayName = 'ChakraRouterLink';

function mergeRelTokens(rel: string | undefined, requiredTokens: string[]) {
  const tokens: string[] = [];
  const normalizedTokens = new Set<string>();

  for (const token of rel?.split(/\s+/u).filter(Boolean) ?? []) {
    const normalizedToken = token.toLowerCase();
    if (normalizedTokens.has(normalizedToken)) continue;
    tokens.push(token);
    normalizedTokens.add(normalizedToken);
  }

  for (const requiredToken of requiredTokens) {
    if (normalizedTokens.has(requiredToken)) continue;
    tokens.push(requiredToken);
    normalizedTokens.add(requiredToken);
  }

  return tokens.join(' ');
}