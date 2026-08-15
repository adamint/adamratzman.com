import { useEffect, useState } from 'react';
import deepEqual from 'deep-equal';

function getLocalStorageObj<T>(key: string) {
  const localStorageValue = localStorage.getItem(key);
  return localStorageValue ? JSON.parse(localStorageValue) as T : null;
}

export function useLocalStorage<T>(key: string, initialValue: T | undefined = undefined, refreshDurationMs: number = 100): [T | null | undefined, (newValue: T) => void, () => void] {
  const [value, setValue] = useState<T | null | undefined>(initialValue ?? getLocalStorageObj<T>(key));

  useEffect(() => {
    const updateValueFromLocalStorage = () => {
      const checkedLocalStorageValue = getLocalStorageObj<T>(key);
      setValue(currentValue => (
        deepEqual(currentValue, checkedLocalStorageValue)
          ? currentValue
          : checkedLocalStorageValue
      ));
    };

    updateValueFromLocalStorage();
    const intervalId = setInterval(updateValueFromLocalStorage, refreshDurationMs);

    return () => clearInterval(intervalId);
  }, [key, refreshDurationMs]);

  function setAndSaveValueToLocalStorage(newValue: T | null) {
    if (!newValue) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(newValue));
    setValue(newValue);
  }

  const deleteValueFromStorage = () => setAndSaveValueToLocalStorage(null);

  return [value, setAndSaveValueToLocalStorage, deleteValueFromStorage];
}