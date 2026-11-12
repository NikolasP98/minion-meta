import { vi } from 'vitest';
// Exclude generated i18n and unrelated external-capability services from the
// original scheduling unit tests; tested slot/write orchestration stays real.
vi.mock('$server/services/custom-properties.service', () => ({
  putCustomPropertyValueInTx: vi.fn(),
}));
vi.mock('$server/services/finance.service', () => ({
  getFinSettings: vi.fn(),
}));
vi.mock('$server/services/pos/settings', () => ({
  getPosCurrencyInTx: vi.fn(),
}));
