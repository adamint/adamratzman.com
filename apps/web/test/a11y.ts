import { axe } from 'jest-axe';
import { expect } from 'vitest';

export async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe(container);

  expect(results.violations).toEqual([]);
}
