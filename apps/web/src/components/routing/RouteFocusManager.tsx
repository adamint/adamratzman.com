import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteFocusManager() {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      document.querySelector<HTMLElement>('#main-content')?.focus();
      previousPathname.current = pathname;
    }
  }, [pathname]);

  return null;
}
