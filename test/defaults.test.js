'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const defaults = require('../src/lib/defaults');

describe('defaults registry', () => {
  it('repos array has entries with name and path', () => {
    assert.ok(defaults.repos.length > 0);
    for (const r of defaults.repos) {
      assert.ok(typeof r.name === 'string', `missing name`);
      assert.ok(typeof r.path === 'string', `missing path for ${r.name}`);
    }
  });

  it('pythonVenvTargets have name and path', () => {
    assert.ok(defaults.pythonVenvTargets.length > 0);
    for (const t of defaults.pythonVenvTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('frontendTargets have name and path', () => {
    assert.ok(defaults.frontendTargets.length > 0);
    for (const t of defaults.frontendTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('goTargets have name and path', () => {
    assert.ok(defaults.goTargets.length > 0);
    for (const t of defaults.goTargets) {
      assert.ok(typeof t.name === 'string');
      assert.ok(typeof t.path === 'string');
    }
  });

  it('launchers have name and label', () => {
    assert.ok(defaults.launchers.length > 0);
    for (const l of defaults.launchers) {
      assert.ok(typeof l.name === 'string');
      assert.ok(typeof l.label === 'string');
    }
  });

  it('launcherConfigs has entry for each launcher', () => {
    for (const l of defaults.launchers) {
      assert.ok(defaults.launcherConfigs[l.name], `missing launcherConfig for ${l.name}`);
      assert.ok(defaults.launcherConfigs[l.name].dev, `missing dev config for ${l.name}`);
      assert.ok(defaults.launcherConfigs[l.name].prod, `missing prod config for ${l.name}`);
    }
  });

  it('pypiDeps is a non-empty array of strings', () => {
    assert.ok(defaults.pypiDeps.length > 0);
    for (const d of defaults.pypiDeps) {
      assert.ok(typeof d === 'string');
    }
  });

  it('toolInstall has entries with url', () => {
    assert.ok(Object.keys(defaults.toolInstall).length > 0);
    for (const [name, info] of Object.entries(defaults.toolInstall)) {
      assert.ok(typeof info.url === 'string', `missing url for ${name}`);
    }
  });
});
