import React, { forwardRef } from 'react';
import {
  Link as RouterLink,
  type LinkProps as ReactRouterLinkProps,
} from 'react-router-dom';

export type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  Omit<ReactRouterLinkProps, 'to'> & {
    href: string;
  };

function isInternalHref(href: string) {
  return href.startsWith('/') && !href.startsWith('//');
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, replace, ...rest }, ref) => {
    if (isInternalHref(href)) {
      return (
        <RouterLink ref={ref} replace={replace} to={href} {...rest}>
          {children}
        </RouterLink>
      );
    }

    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  },
);

Link.displayName = 'NextLinkCompat';

export default Link;
