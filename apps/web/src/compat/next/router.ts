import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

type QueryValue = string | string[];
type Query = Record<string, QueryValue | undefined>;

export function buildNextQuery(search: string, params: Query) {
  const nextQuery: Query = { ...params };
  const searchParams = new URLSearchParams(search);

  for (const [key, value] of searchParams.entries()) {
    if (nextQuery[key] !== undefined) {
      continue;
    }

    nextQuery[key] = value;
  }

  return nextQuery;
}

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const query = useMemo<Query>(() => buildNextQuery(location.search, params), [location.search, params]);

  return {
    pathname: location.pathname,
    asPath: `${location.pathname}${location.search}${location.hash}`,
    query,
    push: (to: string) => {
      void navigate(to);
      return Promise.resolve(true);
    },
    replace: (to: string) => {
      void navigate(to, { replace: true });
      return Promise.resolve(true);
    },
  };
}
