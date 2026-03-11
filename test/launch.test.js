'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('launch command', () => {
  it('parseArgs parses app name', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave']);
    assert.equal(result.app, 'oceanwave');
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave', '--config', '/tmp/oceancode.yaml']);
    assert.equal(result.app, 'oceanwave');
    assert.ok(result.flags.config);
  });
});
