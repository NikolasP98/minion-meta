import { createAuthClient } from 'better-auth/svelte';
import { jwtClient, organizationClient } from 'better-auth/client/plugins';

export interface MinionAuthClientOptions {
  baseURL: string;
}

export function createMinionAuthClient(opts: MinionAuthClientOptions) {
  return createAuthClient({
    baseURL: opts.baseURL,
    plugins: [jwtClient(), organizationClient()],
  });
}
