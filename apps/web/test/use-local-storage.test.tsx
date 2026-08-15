import {
  act,
  cleanup,
  renderHook,
} from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorage } from '../src/components/utils/useLocalStorage';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
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

  it('does not update again after synchronizing an external object change', () => {
    vi.useFakeTimers();
    localStorage.setItem('preference', JSON.stringify({ mode: 'light' }));
    let committedRenderCount = 0;
    const { result } = renderHook(() => {
      const localStorageState = useLocalStorage<{ mode: string }>('preference');
      useEffect(() => {
        committedRenderCount += 1;
      });
      return localStorageState;
    });
    const initialCommittedRenderCount = committedRenderCount;

    localStorage.setItem('preference', JSON.stringify({ mode: 'dark' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current[0]).toEqual({ mode: 'dark' });
    expect(committedRenderCount).toBe(initialCommittedRenderCount + 1);
    const synchronizedRenderCount = committedRenderCount;

    for (let interval = 0; interval < 3; interval += 1) {
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(committedRenderCount).toBe(synchronizedRenderCount);
    }
  });

  it('observes an external object change back to the initial value', () => {
    vi.useFakeTimers();
    localStorage.setItem('preference', JSON.stringify({ mode: 'light' }));
    const { result } = renderHook(() => (
      useLocalStorage<{ mode: string }>('preference')
    ));

    localStorage.setItem('preference', JSON.stringify({ mode: 'dark' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current[0]).toEqual({ mode: 'dark' });

    localStorage.setItem('preference', JSON.stringify({ mode: 'light' }));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current[0]).toEqual({ mode: 'light' });
  });
});
