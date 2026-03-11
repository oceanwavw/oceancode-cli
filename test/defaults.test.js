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

  it('defaults does not export pythonVenvTargets, frontendTargets, goTargets, preflightTools', () => {
    assert.equal(defaults.pythonVenvTargets, undefined);
    assert.equal(defaults.frontendTargets, undefined);
    assert.equal(defaults.goTargets, undefined);
    assert.equal(defaults.preflightTools, undefined);
  });

  it('defaults does not export pypiDeps', () => {
    assert.equal(defaults.pypiDeps, undefined);
  });

  it('defaults still exports toolInstall', () => {
    assert.ok(defaults.toolInstall);
    assert.ok(defaults.toolInstall.node);
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

  it('toolInstall has entries with url', () => {
    assert.ok(Object.keys(defaults.toolInstall).length > 0);
    for (const [name, info] of Object.entries(defaults.toolInstall)) {
      assert.ok(typeof info.url === 'string', `missing url for ${name}`);
    }
  });
});
