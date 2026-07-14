import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { builtAgents } from './builder.js';

describe('builtAgents runtime linkage', () => {
  it('exports an additive nullable runtime agent ID column', () => {
    const columns = getTableColumns(builtAgents);

    expect(getTableName(builtAgents)).toBe('built_agents');
    expect(columns.runtimeAgentId.name).toBe('runtime_agent_id');
    expect(columns.runtimeAgentId.notNull).toBe(false);
    expect(columns.runtimeAgentId.hasDefault).toBe(false);
  });

  it('models the runtime-agent lookup as the same partial index used by the migration', () => {
    const runtimeIndex = getTableConfig(builtAgents).indexes.find(
      (candidate) => candidate.config.name === 'idx_built_agents_runtime_agent',
    );

    expect(runtimeIndex).toBeDefined();
    expect(runtimeIndex?.config.where).toBeDefined();
  });
});
