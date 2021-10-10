import { useEffect, useState } from 'react';

export function useData(dataProducer, dependents = []) {
  const [request, setRequest] = useState({
    loading: true,
    data: null,
    error: null,
    update: updateData,
  });

  useEffect(() => {
    (async () => {
      await updateData(dataProducer);
    })();
  }, dependents);

  async function updateData(producer) {
    try {
      setRequest({
        data: await producer(),
        error: null,
        loading: false,
        update: updateData,
      });
    } catch (error) {
      console.log(error);
      setRequest({
        data: null,
        error: error,
        loading: false,
        update: updateData,
      });
    }
  }


  return request;
}