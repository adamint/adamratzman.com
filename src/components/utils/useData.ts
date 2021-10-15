import { useState } from 'react';
import { useDeepCompareEffectNoCheck } from 'use-deep-compare-effect';

type UseDataType<T> = {
  loading: boolean;
  data: T | null;
  error: any | null;
  update: (producer: (args: any[]) => Promise<T>, setLoading: boolean, args: any[]) => Promise<void>
}

export function useData<T>(dataProducer: (...args: any[]) => Promise<T>, dependents: any[] = [], dataProducerArgs: any[] = [], setLoadingOnRefresh: boolean = false) {
  const [request, setRequest] = useState<UseDataType<T>>({
    loading: true,
    data: null,
    error: null,
    update: updateData,
  });

  useDeepCompareEffectNoCheck(() => {
    const timeout = setTimeout(() => {
      updateData(dataProducer, setLoadingOnRefresh, dataProducerArgs);
    });

    return () => {
      clearTimeout(timeout);
    };
  }, dependents);

  async function updateData(producer: (...args: any[]) => Promise<T>, setLoading: boolean = false, args: any[] = []) {
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