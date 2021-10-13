import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';

export function useData(dataProducer, dependents = [], dataProducerArgs = [], setLoadingOnRefresh = false) {
  const [request, setRequest] = useState({
    loading: true,
    data: null,
    error: null,
    update: updateData,
  });

  useDeepCompareEffectNoCheck(() => {
    updateData(dataProducer, setLoadingOnRefresh, dataProducerArgs);
  }, dependents);

  async function updateData(producer, setLoading = false, args = []) {
    if (setLoading) {
      setRequest({
        data: null,
        error: null,
        loading: true,
        update: updateData,
      });
    }

    try {
      setRequest({
        data: await producer(...args),
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