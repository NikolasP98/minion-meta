import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { readdir, readFile } from 'node:fs/promises';
import Badge, { resolveBadgeColor, resolveBadgeTokens } from './Badge.svelte';
import Button from './Button.svelte';
import Input from './Input.svelte';
import Toggle from './Toggle.svelte';

describe('Button', () => {
  it('removes href and tab stop from a disabled link', () => {
    const { body } = render(Button, {
      props: { href: '/settings', disabled: true, 'aria-label': 'Open settings' },
    });

    expect(body).toContain('<a');
    expect(body).not.toContain('href="/settings"');
    expect(body).toContain('aria-disabled="true"');
    expect(body).toContain('tabindex="-1"');
  });

  it('exposes busy state while retaining its accessible label', () => {
    const { body } = render(Button, {
      props: { loading: true, 'aria-label': 'Save changes' },
    });

    expect(body).toContain('aria-busy="true"');
    expect(body).toContain('aria-label="Save changes"');
  });

  it('disambiguates font-size utilities from text-color utilities for Tailwind consumers', () => {
    const { body } = render(Button, { props: { size: 'md', 'aria-label': 'Continue' } });

    expect(body).toContain('text-[length:var(--font-size-body)]');
    expect(body).not.toContain('text-[var(--font-size-body)]');
  });
});

describe('Form controls', () => {
  it('associates input labels, errors, and generated IDs', () => {
    const { body } = render(Input, {
      props: { label: 'Email', error: 'Enter a valid email', required: true },
    });
    const id = body.match(/<input[^>]+\sid="([^"]+)"/)?.[1];

    expect(id).toBeTruthy();
    expect(body).toContain(`for="${id}"`);
    expect(body).toContain(`aria-describedby="${id}-error"`);
    expect(body).toContain('aria-invalid="true"');
  });

  it('requires an accessible toggle label in its public API', () => {
    const { body } = render(Toggle, { props: { label: 'Enable alerts', pressed: true } });
    expect(body).toContain('role="switch"');
    expect(body).toContain('aria-label="Enable alerts"');
    expect(body).toContain('aria-checked="true"');
  });
});

describe('Badge', () => {
  it('uses complete semantic triples and retains the compatibility color helper', () => {
    expect(resolveBadgeTokens('semantic', 'success')).toEqual({
      foreground: 'var(--color-success-fg)',
      surface: 'var(--color-success-surface)',
      border: 'var(--color-success-border)',
    });
    expect(resolveBadgeColor('semantic', 'success')).toBe('var(--color-success-fg)');
    expect(render(Badge, { props: { variant: 'semantic', value: 'success' } }).body).toContain(
      'data-value="success"',
    );
  });
});

describe('Token conformance', () => {
  it('references only tokens declared by the generated shared contract', async () => {
    const css = await readFile(new URL('../../../design-tokens/tokens.css', import.meta.url), 'utf8');
    const declared = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]));
    const sourceRoot = new URL('./', import.meta.url);
    const files = (await readdir(sourceRoot)).filter((file) => file.endsWith('.svelte'));

    for (const file of files) {
      const source = await readFile(new URL(file, sourceRoot), 'utf8');
      const referenced = [...source.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]);
      for (const token of referenced) expect(declared.has(token), `${file}: ${token}`).toBe(true);
    }
  });
});
