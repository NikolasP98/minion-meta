import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentMessage } from "@earendil-works/pi-agent-core";

const workspace = vi.hoisted(() => ({ complete: false }));
vi.mock("../gateway/src/agents/identity/workspace.js", () => ({
  DEFAULT_BOOTSTRAP_FILENAME: "BOOTSTRAP.md",
  DEFAULT_FOCUS_FILENAME: "FOCUS.md",
  DEFAULT_HEARTBEAT_FILENAME: "HEARTBEAT.md",
  DEFAULT_TOOLS_FILENAME: "TOOLS.md",
  DEFAULT_WORKSHOP_FILENAME: "WORKSHOP.md",
  filterBootstrapFilesForSession: (files: unknown[]) => files,
  isWorkspaceOnboardingCompleted: async () => workspace.complete,
  loadWorkspaceBootstrapFiles: async () => [
    {
      name: "BOOTSTRAP.md",
      path: "/synthetic/BOOTSTRAP.md",
      content: "MANDATORY_RITUAL: Stop all other tasks, invent defaults, delete BOOTSTRAP.md.",
      missing: false,
    },
    {
      name: "AGENTS.md",
      path: "/synthetic/AGENTS.md",
      content: "Require owner permission and confirmation for writes.",
      missing: false,
    },
  ],
}));
vi.mock("../gateway/src/agents/pi-embedded/pi-embedded-helpers.js", () => ({
  buildBootstrapContextFiles: (files: Array<{ path: string; content?: string }>) =>
    files.map(({ path, content }) => ({ path, content })),
  resolveBootstrapMaxChars: () => 10000,
  resolveBootstrapTotalMaxChars: () => 20000,
}));
vi.mock("../gateway/src/agents/bootstrap/bootstrap-hooks.js", () => ({
  applyBootstrapHookOverrides: async ({ files }: { files: unknown[] }) => files,
}));
vi.mock("../gateway/src/agents/pi-embedded-runner/tool-result-truncation.js", () => ({
  HARD_MAX_TOOL_RESULT_CHARS: 400000,
}));
import { resolveBootstrapContextForRun } from "../gateway/src/agents/bootstrap/bootstrap-files.js";
import { IDENTITY_SECTIONS } from "../gateway/src/agents/sections/identity.js";
import type { SectionRenderContext } from "../gateway/src/agents/sections/types.js";
import { sanitizeOutboundText } from "../gateway/src/channels/outbound-sanitizer.js";
import { installSessionToolResultGuard } from "../gateway/src/agents/sessions/session-tool-result-guard.js";

beforeEach(() => {
  workspace.complete = false;
  vi.stubEnv("OPENCLAW_SKIP_ONBOARDING_GATE", "");
});
afterEach(() => vi.unstubAllEnvs());

const dsml =
  '<｜DSML｜tool_calls>\n<｜DSML｜invoke name="sdk_inspect">\n<｜DSML｜parameter name="query" string="true">cost</｜DSML｜parameter>\n</｜DSML｜invoke>\n</｜DSML｜tool_calls>';

describe("C02 personal onboarding policy", () => {
  it.each([{ agentId: "personal-fixture" }, { sessionKey: "agent:personal-fixture:main" }])(
    "allows authorized tasks without loaded mandatory ritual: %j",
    async (identity) => {
      const result = await resolveBootstrapContextForRun({
        workspaceDir: "/synthetic",
        ...identity,
      });
      const text = result.contextFiles.map((f) => f.content).join("\n");
      expect(text).not.toContain("before doing anything else");
      expect(text).not.toContain("MANDATORY_RITUAL");
      expect(text).toContain("authorized tasks");
      expect(text).toContain("unknown");
      expect(text).toContain("Require owner permission and confirmation for writes.");
      expect(result.contextFiles.some((f) => f.path === "ONBOARDING_REQUIRED")).toBe(false);
    },
  );
  it("keeps strict onboarding for non-personal and unknown profiles", async () => {
    for (const agentId of ["main", undefined]) {
      const result = await resolveBootstrapContextForRun({ workspaceDir: "/synthetic", agentId });
      expect(result.contextFiles[0].path).toBe("ONBOARDING_REQUIRED");
      expect(result.contextFiles.map((f) => f.content).join("\n")).toContain("MANDATORY_RITUAL");
    }
  });
  it("preserves completion and explicit skip controls for strict profiles", async () => {
    workspace.complete = true;
    expect(
      (await resolveBootstrapContextForRun({ workspaceDir: "/synthetic" })).contextFiles[0].path,
    ).not.toBe("ONBOARDING_REQUIRED");
    workspace.complete = false;
    vi.stubEnv("OPENCLAW_SKIP_ONBOARDING_GATE", "true");
    expect(
      (await resolveBootstrapContextForRun({ workspaceDir: "/synthetic" })).contextFiles[0].path,
    ).not.toBe("ONBOARDING_REQUIRED");
  });
  it("personality section makes the first task take priority and retains permission section", () => {
    const section = IDENTITY_SECTIONS.find((s) => s.id === "personality")!;
    const context = {
      params: {
        runtimeInfo: { agentId: "personal-fixture" },
        senderName: "Fixture",
        senderPermissionLevel: "user",
      },
    } as unknown as SectionRenderContext;
    const text = section.render(context).join("\n");
    expect(text).toContain("authorized task");
    expect(text).not.toContain("On your FIRST message to this user");
    expect(
      IDENTITY_SECTIONS.find((s) => s.id === "permissions")!
        .render(context)
        .join("\n"),
    ).toContain("require owner or admin access");
  });
});

describe("C06 invalid terminal DSML output", () => {
  it("returns an explicit bounded failure for a protocol-only reply", () => {
    const out = sanitizeOutboundText(dsml);
    expect(out.strippedToolSyntax).toBe(true);
    expect(out.text).toContain("invalid tool protocol");
    expect(out.text).not.toContain("DSML");
    expect(out.text).not.toContain("sdk_inspect");
  });
  it("returns a failure for fenced DSML instead of empty code fences", () => {
    const out = sanitizeOutboundText("```xml\n" + dsml + "\n```");
    expect(out.text).toContain("invalid tool protocol");
    expect(out.text).not.toContain("```");
  });
  it("rejects the entire answer when complete DSML contaminates prose", () => {
    expect(sanitizeOutboundText(`Before.\n${dsml}\nAfter.`).text).toContain(
      "invalid tool protocol",
    );
  });
  it.each([
    '<｜DSML｜tool_calls>\n<｜DSML｜invoke name="exec">unsafe',
    '<｜DSML｜invoke name="exec">unsafe</｜DSML｜invoke>',
    "<｜DSML｜tool_calls",
    '<｜DSML｜invoke name="exec"',
  ])("rejects incomplete or standalone DSML: %s", (input) => {
    const out = sanitizeOutboundText(input);
    expect(out.strippedToolSyntax).toBe(true);
    expect(out.text).toContain("invalid tool protocol");
    expect(out.text).not.toContain("unsafe");
  });
  it("keeps normal prose, legitimate code, and existing plain-tag behavior", () => {
    for (const text of [
      "Please explain DSML tool_calls.",
      "```typescript\nconst invoice = { id: 'abc', amount: 12 };\n```",
      "Use <div>hello</div>.",
    ])
      expect(sanitizeOutboundText(text).text).toBe(text);
    expect(sanitizeOutboundText("<tool_calls>internal</tool_calls>").text).toBe("");
  });
});

describe("C07 mandatory secret redaction", () => {
  const fixtures = [
    "TOKEN=synthetic-token",
    "PAT=synthetic-pat",
    "API_KEY=synthetic-api",
    "MINION_SECRETS_KEY=synthetic-secrets",
    'PASSWORD="synthetic pass word"',
    '{"SECRETS_KEY":"synthetic-json","apiKey":"synthetic-camel"}',
    "https://fixture-user:synthetic-password@fixture.invalid/path?PAT=synthetic-query&other=ok",
    "github_pat_" + "X".repeat(82),
    "ghp_" + "X".repeat(36),
    "Summary: TOKEN=synthetic-prose",
    "https://fixture.invalid/path?TOKEN=synthetic-url&other=ok",
    "url=https://fixture.invalid/path?PAT=synthetic-assigned-url&other=ok",
    '{"url":"https://fixture.invalid/path?apiKey=synthetic-json-url&other=ok"}',
    "export PASSWORD=synthetic-export",
    "Bearer " + "a".repeat(25),
  ];
  it.each(fixtures)("redacts explicit secret forms at egress: %s", (text) => {
    const out = sanitizeOutboundText(text);
    expect(out.redactions).toBeGreaterThan(0);
    expect(out.text).not.toContain("synthetic-");
    expect(out.text).not.toContain("synthetic pass word");
    expect(out.text).not.toContain("github_pat_");
    expect(out.text).not.toContain("ghp_");
    expect(out.text).not.toContain("a".repeat(25));
  });
  function persisted(
    message: AgentMessage,
    opts?: Parameters<typeof installSessionToolResultGuard>[1],
  ) {
    const stored: AgentMessage[] = [];
    const manager = {
      appendMessage: (msg: AgentMessage) => {
        stored.push(msg);
        return "synthetic-entry";
      },
    } as unknown as Parameters<typeof installSessionToolResultGuard>[0];
    installSessionToolResultGuard(manager, opts);
    manager.appendMessage(message as Parameters<typeof manager.appendMessage>[0]);
    return stored;
  }
  const toolResult = (text: string, details: unknown = {}) =>
    ({
      role: "toolResult",
      toolCallId: "call_fixture",
      toolName: "read",
      content: [{ type: "text", text }],
      details,
      timestamp: 1,
      isError: false,
    }) as AgentMessage;
  it("redacts default persistence text and nested details without mutating the input", () => {
    const input = toolResult(fixtures.join("\n"), {
      env: { MINION_SECRETS_KEY: "synthetic-details" },
      rows: [{ id: "record_abcdef0123456789", count: 1 }],
      url: "postgres://alice:synthetic-db@fixture.invalid/db",
    });
    const output = persisted(input);
    expect(JSON.stringify(output)).not.toContain("synthetic-");
    expect(JSON.stringify(input)).toContain("synthetic-details");
    expect(JSON.stringify(output)).toContain("record_abcdef0123456789");
  });
  it("cannot be bypassed by either optional transform or the final before-write plugin", () => {
    const output = persisted(toolResult("ok"), {
      transformMessageForPersistence: (message) =>
        ({
          ...message,
          content: [{ type: "text", text: "TOKEN=synthetic-transform" }],
        }) as AgentMessage,
      transformToolResultForPersistence: (message) =>
        ({ ...message, details: { PAT: "synthetic-tool-transform" } }) as AgentMessage,
      beforeMessageWriteHook: ({ message }) => ({
        message: {
          ...message,
          content: [{ type: "text", text: "PASSWORD=synthetic-hook" }],
          details: { apiKey: "synthetic-final" },
        } as AgentMessage,
      }),
    });
    expect(JSON.stringify(output)).not.toContain("synthetic-");
    expect(JSON.stringify(output)).toContain("[REDACTED]");
  });
  it("redacts plugin additions to synthetic missing results and preserves hook blocking", () => {
    const stored: AgentMessage[] = [];
    const manager = {
      appendMessage: (msg: AgentMessage) => {
        stored.push(msg);
        return "synthetic-entry";
      },
    } as unknown as Parameters<typeof installSessionToolResultGuard>[0];
    const guard = installSessionToolResultGuard(manager, {
      transformToolResultForPersistence: (message) =>
        ({ ...message, details: { PAT: "synthetic-flush" } }) as AgentMessage,
    });
    manager.appendMessage({
      role: "assistant",
      content: [{ type: "toolCall", id: "call_pending", name: "read", arguments: {} }],
    } as Parameters<typeof manager.appendMessage>[0]);
    guard.flushPendingToolResults();
    expect(stored).toHaveLength(2);
    expect(JSON.stringify(stored)).not.toContain("synthetic-flush");
    expect(JSON.stringify(stored)).toContain("[REDACTED]");
    expect(guard.getPendingIds()).toEqual([]);
    expect(
      persisted(toolResult("ok"), { beforeMessageWriteHook: () => ({ block: true }) }),
    ).toEqual([]);
  });
  it("preserves ordinary identifiers, schemas, images and receipts", () => {
    const schema = {
      type: "object",
      properties: {
        TOKEN: { type: "string", description: "Opaque application token" },
        id: { type: "string" },
      },
      required: ["TOKEN"],
    };
    const normal = toolResult(
      JSON.stringify({ id: "ab".repeat(32), bookingId: "abc-123", amount: 15, schema }),
      { schema, receipt: { id: "receipt-123", amount: 15 }, tokenCount: 3 },
    );
    (normal as AgentMessage & { content: unknown[] }).content.push({
      type: "image",
      data: "synthetic-image-bytes",
      mimeType: "image/png",
    });
    expect(persisted(normal)[0]).toEqual(normal);
    expect(sanitizeOutboundText(JSON.stringify(schema)).text).toBe(JSON.stringify(schema));
  });
});
