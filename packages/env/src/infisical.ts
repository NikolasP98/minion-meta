export interface InfisicalFetchResult {
	ok: boolean;
	env: Record<string, string>;
	error?: string;
}

export interface InfisicalFetchOptions {
	domain?: string;
	noCache?: boolean;
	env?: string; // dev / prod
	ttlMs?: number;
}

// Stub — real implementation lands in Task 2. Returns empty layer.
// Tests mock this module via vi.spyOn so the stub is never called in CI.
export async function fetchInfisicalSecrets(
	_projectSlug: string,
	_opts: InfisicalFetchOptions = {},
): Promise<InfisicalFetchResult> {
	return { ok: false, env: {}, error: 'stub — implement in Task 2' };
}
