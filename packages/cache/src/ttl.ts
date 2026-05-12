const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export type Duration = number | `${number}${'s' | 'm' | 'h' | 'd'}`;

export function parseDuration(input: number | string): number {
  if (typeof input === 'number') {
    if (input < 0 || !Number.isFinite(input)) {
      throw new Error(`Invalid duration: ${input}`);
    }
    return input;
  }
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) {
    throw new Error(`Invalid duration: "${input}" (expected e.g. "5m", "30s")`);
  }
  return Number(match[1]) * UNITS[match[2]!]!;
}
