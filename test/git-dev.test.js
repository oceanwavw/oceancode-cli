'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('git-dev command', () => {
  it('only supports status action', () => {
    const { ACTIONS } = require('../src/commands/git-dev');
    assert.deepEqual(ACTIONS, ['status']);
  });

  it('parseArgs parses status action', () => {
    const { parseArgs } = require('../src/commands/git-dev');
    const result = parseArgs(['status']);
    assert.equal(result.action, 'status');
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/git-dev');
    assert.equal(typeof mod.run, 'function');
  });
});
