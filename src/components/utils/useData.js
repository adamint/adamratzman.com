import { useEffect, useState } from 'react';

export function useData(dataProducer) {
  const [request, setRequest] = useState({
    loading: true,
    data: null,
    error: null,
    update: updateData,
  });

  async function updateData(producer) {
    try {
      setRequest({
        data: await producer(),
        error: null,
        loading: false,
        update: updateData
      });
    } catch (error) {
      setRequest({
        data: null,
        error: error,
        loading: false,
        update: updateData
      });
    }
  }

  useEffect(() => {
    (async () => {
      await updateData(dataProducer);
    })();
  }, []);


  return request;
}