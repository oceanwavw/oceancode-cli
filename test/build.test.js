// test/build.test.js
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('build command', () => {
  it('parseArgs defaults to all modules', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs([]);
    assert.equal(result.module, null);
    assert.equal(result.flags.skipPreflight, false);
  });

  it('parseArgs parses module name', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['dataportal']);
    assert.equal(result.module, 'dataportal');
  });

  it('parseArgs parses --skip-preflight flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--skip-preflight']);
    assert.equal(result.flags.skipPreflight, true);
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--config', '/tmp/test.yaml']);
    assert.equal(result.flags.config, '/tmp/test.yaml');
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/build');
    assert.equal(typeof mod.run, 'function');
  });
});
