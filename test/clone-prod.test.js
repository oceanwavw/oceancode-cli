'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('clone-prod command', () => {
  it('parseArgs parses base-url', () => {
    const { parseArgs } = require('../src/commands/clone-prod');
    const result = parseArgs(['https://github.com/org']);
    assert.equal(result.baseUrl, 'https://github.com/org');
  });

  it('run function is exported', () => {
    const mod = require('../src/commands/clone-prod');
    assert.equal(typeof mod.run, 'function');
  });

  it('parseArgs strips trailing slash from base-url', () => {
    const { parseArgs } = require('../src/commands/clone-prod');
    const result = parseArgs(['https://github.com/org/']);
    assert.equal(result.baseUrl, 'https://github.com/org');
  });
});
