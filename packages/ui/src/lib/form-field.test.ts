import { expect, it } from 'vitest';
import { render } from 'svelte/server';
import Fixture from './FormField.test.svelte';
it('keeps guidance and error with stable referenced IDs', () => {
  const body = render(Fixture).body;
  expect(body).toContain('Use your public name');
  expect(body).toContain('A name is required');
  expect(body).toContain('aria-describedby="name-helper name-error"');
  expect(body).toContain('id="name-helper"');
  expect(body).toContain('id="name-error"');
});
