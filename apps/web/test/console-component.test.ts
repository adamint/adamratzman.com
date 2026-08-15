import { describe, expect, it, vi } from 'vitest';
import {
  loadConsoleTerminal,
  resolveConsoleTerminal,
} from '../src/components/nav/ConsoleComponent';

function Terminal() {
  return null;
}

describe('console terminal interop', () => {
  it.each([
    [{ default: Terminal }],
    [{ default: { default: Terminal } }],
    [{ 'module.exports': { default: Terminal } }],
  ])('resolves supported CommonJS module shapes', (module) => {
    expect(resolveConsoleTerminal(module)).toBe(Terminal);
  });

  it('returns null when the package has an unsupported shape', () => {
    expect(resolveConsoleTerminal({ default: 'not a component' })).toBeNull();
  });

  it('contains a runtime import failure instead of rejecting the shell', async () => {
    const loadModule = vi.fn().mockRejectedValue(new Error('module interop failed'));

    await expect(loadConsoleTerminal(loadModule)).resolves.toBeNull();
  });
});
