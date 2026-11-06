import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  request: vi.fn(),
  summary: vi.fn(),
  series: vi.fn(),
  products: vi.fn(),
  clients: vi.fn(),
}));
vi.mock("../gateway/src/logging/tool-tracking.js", () => ({
  wrapToolWithTracking: (tool: unknown) => tool,
}));
vi.mock("../gateway/src/agents/tools/hub/hub-common.js", () => ({
  hubToolsAvailable: () => true,
  ORG_ID_FIELD: { type: "string" },
  hubGet: fixture.request,
}));
vi.mock("../hub/src/routes/api/gateway/_shared/action-auth", () => ({
  requireAssistantCapability: vi.fn(async () => ({
    ctx: { tenantId: "synthetic-org" },
    capabilities: { fieldLevel: () => 100 },
  })),
}));
vi.mock("../hub/src/lib/permissions", () => ({ SENSITIVE_FIELD_LEVEL: 50 }));
vi.mock("../hub/src/server/services/finance.service", () => ({
  getFinSettings: async () => ({ timezone: "America/Lima" }),
  financeSummary: fixture.summary,
  maskFinanceSummary: (v: unknown) => v,
  revenueSeries: fixture.series,
  topProducts: fixture.products,
  topClients: fixture.clients,
}));
import { createFinanceQueryTool } from "../gateway/src/agents/tools/hub/finance-query-tool";
import { GET } from "../hub/src/routes/api/gateway/query/finance/+server";
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.clearAllMocks();
  fixture.summary.mockResolvedValue({ total: 0 });
  fixture.series.mockResolvedValue([]);
  fixture.products.mockResolvedValue([]);
  fixture.clients.mockResolvedValue([]);
  fixture.request.mockImplementation(
    async (_path: string, _agent: string, query: Record<string, unknown>) => {
      const url = new URL("https://synthetic.invalid/query/finance");
      for (const [key, value] of Object.entries(query))
        if (value !== undefined) url.searchParams.set(key, String(value));
      const response = await GET({ url, locals: {} } as Parameters<typeof GET>[0]);
      return response.json();
    },
  );
});
it.each([
  { dateFrom: "" },
  { dateTo: "   " },
  { range: "all", dateFrom: "" },
  { range: "" },
  { bucket: "  " },
])("rejects explicit blank tool period fields before HTTP forwarding: %j", async (args) => {
  const tool = createFinanceQueryTool({ agentId: "personal-synthetic" })!;
  await expect(tool.execute("synthetic", args)).rejects.toThrow(Object.hasOwn(args, "dateFrom") ? "dateFrom" : Object.keys(args)[0]);
  expect(fixture.request).not.toHaveBeenCalled();
  for (const aggregate of [fixture.summary, fixture.series, fixture.products, fixture.clients])
    expect(aggregate).not.toHaveBeenCalled();
});
it("keeps genuinely absent dates distinct from intentional all-time through adapter and real route", async () => {
  const tool = createFinanceQueryTool({ agentId: "personal-synthetic" })!;
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-07T02:00:00Z"));
  const result = await tool.execute("synthetic", {});
  expect(result.details).toMatchObject({
    periodSemantics: {
      mode: "rolling-12-months",
      timezone: "America/Lima",
      calendarFrom: "2029-01-06",
      calendarTo: "2030-01-06",
    },
  });
  expect(fixture.summary.mock.calls[0][1]).toMatchObject({
    from: "2029-01-06T05:00:00.000Z",
    to: "2030-01-07T05:00:00.000Z",
  });
  await tool.execute("synthetic", { range: "all" });
  expect(fixture.summary.mock.calls[1][1]).toMatchObject({ from: null, to: null });
});
it.each([
  { dateFrom: "2030-02-30" },
  { dateFrom: "2030-03-02", dateTo: "2030-03-01" },
  { range: "all", dateTo: "2030-03-01" },
])(
  "invalid explicit tool periods reach the real parser and never query aggregates: %j",
  async (args) => {
    await expect(
      createFinanceQueryTool({ agentId: "personal-synthetic" })!.execute("synthetic", args),
    ).rejects.toMatchObject({ status: 400 });
    for (const aggregate of [fixture.summary, fixture.series, fixture.products, fixture.clients])
      expect(aggregate).not.toHaveBeenCalled();
  },
);

it.each([{ dateFrom: 123 }, { dateTo: null }, { range: false }, { bucket: ["month"] }])(
  "rejects wrong-type explicit tool fields before forwarding: %j",
  async (args) => {
    await expect(
      createFinanceQueryTool({ agentId: "personal-synthetic" })!.execute("synthetic", args),
    ).rejects.toThrow(Object.hasOwn(args, "dateFrom") ? "dateFrom" : Object.keys(args)[0]);
    expect(fixture.request).not.toHaveBeenCalled();
    for (const aggregate of [fixture.summary, fixture.series, fixture.products, fixture.clients])
      expect(aggregate).not.toHaveBeenCalled();
  },
);
it("rejects non-leap February 29 at the real route without aggregate calls", async () => {
  await expect(
    createFinanceQueryTool({ agentId: "personal-synthetic" })!.execute("synthetic", {
      dateFrom: "2025-02-29",
    }),
  ).rejects.toMatchObject({ status: 400 });
  for (const aggregate of [fixture.summary, fixture.series, fixture.products, fixture.clients])
    expect(aggregate).not.toHaveBeenCalled();
});
it.each([
  [
    { dateFrom: "2024-02-29", dateTo: "2024-02-29" },
    "2024-02-29T05:00:00.000Z",
    "2024-03-01T05:00:00.000Z",
  ],
  [{ dateFrom: "2030-01-07" }, "2030-01-07T05:00:00.000Z", null],
  [{ dateTo: "2030-01-07" }, null, "2030-01-08T05:00:00.000Z"],
] as const)(
  "resolves leap/one-sided local-day adapter requests to exact UTC boundaries: %j",
  async (args, from, to) => {
    await createFinanceQueryTool({ agentId: "personal-synthetic" })!.execute("synthetic", args);
    for (const fn of [fixture.summary, fixture.series, fixture.products, fixture.clients])
      expect(fn.mock.calls[0][1]).toMatchObject({ from, to });
  },
);
