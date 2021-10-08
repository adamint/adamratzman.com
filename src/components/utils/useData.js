import { useEffect, useState } from 'react';

export function useData(dataProducer) {
  const [request, setRequest] = useState({
    loading: true,
    data: null,
    error: null,
  });

  useEffect(() => {
    (async () => {
      try {
        setRequest({
          data: await dataProducer(),
          error: null,
          loading: false,
        });
      } catch (error) {
        setRequest({
          data: null,
          error: error,
          loading: false,
        });
      }
    })();
  }, [])


  return request;
}