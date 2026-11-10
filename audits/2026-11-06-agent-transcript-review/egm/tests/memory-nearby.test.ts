import { vi } from "vitest";
vi.mock("../gateway/src/infra/posthog.js", () => ({ trackEvent: vi.fn() }));
vi.mock("../gateway/src/infra/sentry.js", () => ({ addSentryBreadcrumb: vi.fn() }));
vi.mock("../gateway/src/logging/subsystem.js", () => ({
  createSubsystemLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn() }),
}));
import "../gateway/src/memory/extract-memories-runner.test.js";
import "../gateway/src/memory/extract-memories.test.js";
import "../gateway/src/agents/pi-embedded-runner/run/strip-injected-context.test.js";
