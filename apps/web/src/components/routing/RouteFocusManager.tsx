import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteFocusManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.querySelector<HTMLElement>('#main-content')?.focus();
  }, [pathname]);

  return null;
}
