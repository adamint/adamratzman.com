import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLatestAsyncData } from '../src/components/utils/useLatestAsyncData';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useLatestAsyncData', () => {
  it('starts one effective request during a StrictMode mount', async () => {
    const producer = vi.fn().mockResolvedValue('current');
    const { result } = renderLatest(producer);

    await waitFor(() => {
      expect(result.current).toEqual({
        data: 'current',
        error: false,
        loading: false,
      });
    });

    expect(producer).toHaveBeenCalledOnce();
    const signal = producer.mock.calls[0]?.[0] as AbortSignal | undefined;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
  });

  it('keeps loading owned by the newest generation', async () => {
    const oldRequest = deferred<string>();
    const newRequest = deferred<string>();
    const oldProducer = vi.fn().mockReturnValue(oldRequest.promise);
    const newProducer = vi.fn().mockReturnValue(newRequest.promise);
    const { rerender, result } = renderLatest(oldProducer);

    await waitFor(() => {
      expect(oldProducer).toHaveBeenCalledOnce();
    });
    rerender({ producer: newProducer });
    await waitFor(() => {
      expect(newProducer).toHaveBeenCalledOnce();
    });

    oldRequest.resolve('old');
    await act(async () => {
      await oldRequest.promise;
    });
    expect(result.current).toEqual({
      data: null,
      error: false,
      loading: true,
    });

    newRequest.resolve('new');
    await waitFor(() => {
      expect(result.current).toEqual({
        data: 'new',
        error: false,
        loading: false,
      });
    });
  });

  it('ignores stale success after producer supersession', async () => {
    const oldRequest = deferred<string>();
    const oldProducer = vi.fn().mockReturnValue(oldRequest.promise);
    const newProducer = vi.fn().mockResolvedValue('new');
    const { rerender, result } = renderLatest(oldProducer);

    await waitFor(() => {
      expect(oldProducer).toHaveBeenCalledOnce();
    });
    rerender({ producer: newProducer });
    await waitFor(() => {
      expect(result.current.data).toBe('new');
    });

    oldRequest.resolve('old');
    await act(async () => {
      await oldRequest.promise;
    });

    expect(result.current.data).toBe('new');
    expect(result.current.error).toBe(false);
  });

  it('ignores stale rejection after producer supersession', async () => {
    const oldRequest = deferred<string>();
    const oldProducer = vi.fn().mockReturnValue(oldRequest.promise);
    const newProducer = vi.fn().mockResolvedValue('new');
    const { rerender, result } = renderLatest(oldProducer);

    await waitFor(() => {
      expect(oldProducer).toHaveBeenCalledOnce();
    });
    rerender({ producer: newProducer });
    await waitFor(() => {
      expect(result.current.data).toBe('new');
    });

    oldRequest.reject(new Error('raw stale failure'));
    await act(async () => {
      await oldRequest.promise.catch(() => undefined);
    });

    expect(result.current).toEqual({
      data: 'new',
      error: false,
      loading: false,
    });
    expect(document.body).not.toHaveTextContent('raw stale failure');
  });

  it('treats AbortError as cancellation rather than an error', async () => {
    const producer = vi.fn().mockRejectedValue(
      new DOMException('raw abort detail', 'AbortError'),
    );
    const { result } = renderLatest(producer);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      data: null,
      error: false,
      loading: false,
    });
    expect(document.body).not.toHaveTextContent('raw abort detail');
  });

  it('contains ordinary errors without exposing their text', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const producer = vi.fn().mockRejectedValue(new Error('raw request detail'));
    const { result } = renderLatest(producer);

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    expect(result.current).toEqual({
      data: null,
      error: true,
      loading: false,
    });
    expect(document.body).not.toHaveTextContent('raw request detail');
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('raw request detail');
    expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('raw request detail');
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain('raw request detail');
  });

  it('resets data, error, and loading when the producer becomes null', async () => {
    const producer = vi.fn().mockResolvedValue('loaded');
    const { rerender, result } = renderLatest(producer);

    await waitFor(() => {
      expect(result.current.data).toBe('loaded');
    });
    rerender({ producer: null });

    await waitFor(() => {
      expect(result.current).toEqual({
        data: null,
        error: false,
        loading: false,
      });
    });
  });

  it('aborts the active signal on unmount', async () => {
    const request = deferred<string>();
    let signal: AbortSignal | undefined;
    const producer = vi.fn((requestSignal: AbortSignal) => {
      signal = requestSignal;
      return request.promise;
    });
    const { unmount } = renderLatest(producer);

    await waitFor(() => {
      expect(producer).toHaveBeenCalledOnce();
    });
    unmount();

    expect(signal?.aborted).toBe(true);
  });

  it('does not update state after unmount', async () => {
    const request = deferred<string>();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const producer = vi.fn().mockReturnValue(request.promise);
    const { unmount } = renderLatest(producer);

    await waitFor(() => {
      expect(producer).toHaveBeenCalledOnce();
    });
    unmount();
    request.resolve('late');
    await act(async () => {
      await request.promise;
    });

    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(/state update|unmounted/i);
  });
});

function renderLatest<T>(
  producer: ((signal: AbortSignal) => Promise<T>) | null,
) {
  return renderHook(
    ({ producer: currentProducer }) => useLatestAsyncData(currentProducer),
    {
      initialProps: { producer },
      wrapper: StrictModeWrapper,
    },
  );
}

function StrictModeWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}
