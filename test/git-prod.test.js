'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('git-prod command', () => {
  it('parseArgs parses action', () => {
    const { parseArgs } = require('../src/commands/git-prod');
    const result = parseArgs(['status']);
    assert.equal(result.action, 'status');
  });

  it('supports all git actions', () => {
    const { ACTIONS } = require('../src/commands/git-prod');
    assert.ok(ACTIONS.includes('status'));
    assert.ok(ACTIONS.includes('commit'));
    assert.ok(ACTIONS.includes('push'));
    assert.ok(ACTIONS.includes('init'));
    assert.ok(ACTIONS.includes('pull'));
    assert.ok(ACTIONS.includes('fetch'));
    assert.ok(ACTIONS.includes('remote-add'));
  });

  it('requireProdroot throws without .prodroot', () => {
    const { requireProdroot } = require('../src/commands/git-prod');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-'));
    assert.throws(() => requireProdroot(tmpDir), /\.prodroot not found/);
  });

  it('requireProdroot passes with .prodroot', () => {
    const { requireProdroot } = require('../src/commands/git-prod');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gp-'));
    fs.writeFileSync(path.join(tmpDir, '.prodroot'), '');
    assert.doesNotThrow(() => requireProdroot(tmpDir));
  });

  it('isReadOnly correctly classifies actions', () => {
    const { isReadOnly } = require('../src/commands/git-prod');
    assert.equal(isReadOnly('status'), true);
    assert.equal(isReadOnly('fetch'), true);
    assert.equal(isReadOnly('commit'), false);
    assert.equal(isReadOnly('push'), false);
  });
});
