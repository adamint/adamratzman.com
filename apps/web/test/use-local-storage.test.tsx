import {
  act,
  cleanup,
  renderHook,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from '../src/components/utils/useLocalStorage';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('useLocalStorage', () => {
  it('persists the new value synchronously', () => {
    localStorage.setItem('preference', JSON.stringify('old-value'));
    const { result } = renderHook(() => useLocalStorage<string>('preference'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('preference')).toBe(JSON.stringify('new-value'));
  });
});
