'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('launch command', () => {
  it('parseArgs parses app name', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave']);
    assert.equal(result.app, 'oceanwave');
    assert.equal(result.flags.prod, false);
  });

  it('parseArgs parses --prod flag', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceandata', '--prod']);
    assert.equal(result.app, 'oceandata');
    assert.equal(result.flags.prod, true);
  });

  it('parseArgs parses --config flag', () => {
    const { parseArgs } = require('../src/commands/launch');
    const result = parseArgs(['oceanwave', '--config', '/tmp/build.yaml']);
    assert.equal(result.app, 'oceanwave');
    assert.ok(result.flags.config);
  });
});
