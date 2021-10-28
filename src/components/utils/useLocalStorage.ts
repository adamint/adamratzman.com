import { useEffect, useState } from 'react';
import deepEqual from 'deep-equal';

export function useLocalStorage<T>(key: string, initialValue: T | undefined = undefined, refreshDurationMs: number = 100): [T | null | undefined, (newValue: T) => void, () => void] {
  const [value, setValue] = useState<T | null | undefined>(initialValue ?? getLocalStorageObj());

  function getLocalStorageObj() {
    const localStorageValue = localStorage.getItem(key);
    return localStorageValue ? JSON.parse(localStorageValue) as T : null;
  }

  useEffect(() => {
    setValue(getLocalStorageObj());

    const intervalId = setInterval(() => {
      const checkedLocalStorageValue = getLocalStorageObj();
      if (!deepEqual(value, checkedLocalStorageValue)) setValue(checkedLocalStorageValue);
    }, refreshDurationMs);

    return () => clearInterval(intervalId);

    // eslint-disable-next-line
  }, []);

  function setAndSaveValueToLocalStorage(newValue: T | null) {
    if (!newValue) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    setValue(newValue);
  }

  const deleteValueFromStorage = () => setAndSaveValueToLocalStorage(null);

  return [value, setAndSaveValueToLocalStorage, deleteValueFromStorage];
}