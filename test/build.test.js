'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('build command', () => {
  it('parseArgs defaults to all target', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs([]);
    assert.equal(result.target, 'all');
    assert.equal(result.pkg, null);
  });

  it('parseArgs parses target and package', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['backends', 'oceanquant']);
    assert.equal(result.target, 'backends');
    assert.equal(result.pkg, 'oceanquant');
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['frontends', '--config', '/tmp/oceancode.yaml']);
    assert.equal(result.target, 'frontends');
    assert.ok(result.flags.config);
  });

  it('parseArgs parses --skip-preflight flag', () => {
    const { parseArgs } = require('../src/commands/build');
    const result = parseArgs(['--skip-preflight']);
    assert.equal(result.flags.skipPreflight, true);
  });

  it('parseArgs rejects unknown target', () => {
    const { parseArgs } = require('../src/commands/build');
    assert.throws(() => parseArgs(['unknown']), /Unknown build target/);
  });
});
