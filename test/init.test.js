'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../src/commands/init');

describe('init command', () => {
  it('parseArgs returns empty flags by default', () => {
    const result = parseArgs([]);
    assert.deepEqual(result.flags, {});
  });

  it('run function is exported', () => {
    const init = require('../src/commands/init');
    assert.ok(typeof init.run === 'function');
  });

  it('parseArgs is exported', () => {
    const init = require('../src/commands/init');
    assert.ok(typeof init.parseArgs === 'function');
  });
});
