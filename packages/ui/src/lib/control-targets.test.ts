import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Checkbox from './Checkbox.svelte';
import Radio from './Radio.svelte';
import Toggle from './Toggle.svelte';

// Actual pointer bounds and activation are qualified in the installed consumer fixture.
describe('native labels and switch semantics with intrinsic coarse targets', () => {
  it('keeps the enlarged checkbox label associated with its native input', () => {
    const { body } = render(Checkbox, { props: { id: 'permission', label: 'Allow editing', checked: true } });
    expect(body).toMatch(/<input[^>]+id="permission"[^>]+checked/);
    expect(body).toMatch(/<label[^>]+for="permission"[^>]+data-part="checkbox-label"/);
    expect(body).toContain('Allow editing');
  });
  it('keeps radio group identity and the native associated target', () => {
    const { body } = render(Radio, { props: { id: 'daily', name: 'frequency', value: 'daily', group: 'daily', label: 'Daily' } });
    expect(body).toMatch(/<input[^>]+id="daily"[^>]+name="frequency"[^>]+value="daily"/);
    expect(body).toMatch(/<label[^>]+for="daily"[^>]+data-part="radio-label"/);
  });
  it('keeps switch state, disabled behavior and caller semantics on the target rather than track', () => {
    const { body } = render(Toggle, { props: { label: 'Enable alerts', pressed: true, disabled: true, tabindex: -1 } });
    const target = body.match(/<button[^>]+>/)?.[0];
    expect(target).toContain('role="switch"');
    expect(target).toContain('aria-checked="true"');
    expect(target).toContain('aria-label="Enable alerts"');
    expect(target).toContain('disabled');
    expect(target).toContain('tabindex="-1"');
    expect(body).toMatch(/<span[^>]+aria-hidden="true"[^>]+data-part="toggle-track"/);
    expect(body.match(/<button/g)).toHaveLength(1);
  });
});
