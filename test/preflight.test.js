'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('preflight', () => {
  it('checkTool returns true for node (always available in test)', () => {
    const { checkTool } = require('../src/lib/build/preflight');
    assert.equal(checkTool('node'), true);
  });

  it('checkTool returns false for nonexistent tool', () => {
    const { checkTool } = require('../src/lib/build/preflight');
    assert.equal(checkTool('__nonexistent_tool_xyz__'), false);
  });

  it('getRequiredTools collects tools for given targets', () => {
    const { getRequiredTools } = require('../src/lib/build/preflight');
    const config = {
      preflight_tools: { backends: ['uv'], frontends: ['node', 'npm'], cli: ['go', 'bun'] },
      local_packages: [],
    };
    const tools = getRequiredTools(config, ['backends']);
    assert.deepEqual(tools, ['uv']);
    const all = getRequiredTools(config, ['backends', 'frontends', 'cli']);
    assert.deepEqual(all, ['uv', 'node', 'npm', 'go', 'bun']);
  });

  it('getRequiredTools adds cargo when rust_extension exists and backends selected', () => {
    const { getRequiredTools } = require('../src/lib/build/preflight');
    const config = {
      preflight_tools: { backends: ['uv'], frontends: ['node'], cli: ['go'] },
      local_packages: [{ name: 'pkg', path: 'lib/pkg', rust_extension: { path: 'lib/pkg/rust' } }],
    };
    const tools = getRequiredTools(config, ['backends']);
    assert.ok(tools.includes('cargo'));
  });
});
