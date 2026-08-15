import { useEffect, useRef, useState } from 'react';

export type LatestAsyncData<T> = {
  data: T | null;
  error: boolean;
  loading: boolean;
};

export function useLatestAsyncData<T>(
  producer: ((signal: AbortSignal) => Promise<T>) | null,
): LatestAsyncData<T> {
  const generationRef = useRef(0);
  const [state, setState] = useState<LatestAsyncData<T>>({
    data: null,
    error: false,
    loading: producer !== null,
  });

  useEffect(() => {
    const generation = ++generationRef.current;
    const controller = new AbortController();
    const { signal } = controller;
    let active = true;

    const canUpdate = () => active
      && !signal.aborted
      && generationRef.current === generation;

    if (!producer) {
      if (canUpdate()) {
        setState({
          data: null,
          error: false,
          loading: false,
        });
      }

      return () => {
        active = false;
        controller.abort();
      };
    }

    if (canUpdate()) {
      setState({
        data: null,
        error: false,
        loading: true,
      });
    }

    const timer = window.setTimeout(() => {
      if (!canUpdate()) return;

      void producer(signal).then(
        data => {
          if (!canUpdate()) return;
          setState({
            data,
            error: false,
            loading: false,
          });
        },
        error => {
          if (!canUpdate()) return;
          setState({
            data: null,
            error: !isAbortError(error),
            loading: false,
          });
        },
      );
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [producer]);

  return state;
}

function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && Reflect.get(error, 'name') === 'AbortError';
}
