'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

describe('buildLoader', () => {
  function tmpBuildYaml(config) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-bl-'));
    fs.writeFileSync(path.join(dir, 'oceancode.build.yaml'), yaml.dump(config));
    return dir;
  }

  it('loads valid flat steps config', () => {
    const dir = tmpBuildYaml({ tools: ['node'], steps: ['npm install', 'npm run build'] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    const result = loadBuildYaml(dir, 'testmod');
    assert.deepEqual(result.tools, ['node']);
    assert.deepEqual(result.steps, ['npm install', 'npm run build']);
  });

  it('loads valid platform-keyed steps config', () => {
    const dir = tmpBuildYaml({
      tools: ['node', 'go'],
      steps: { linux: ['make'], windows: ['nmake'], macos: ['make'] },
    });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    const result = loadBuildYaml(dir, 'testmod');
    assert.deepEqual(result.tools, ['node', 'go']);
    assert.deepEqual(result.steps.linux, ['make']);
  });

  it('throws on missing file', () => {
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml('/nonexistent', 'testmod'), /oceancode\.build\.yaml/);
  });

  it('throws on missing tools key', () => {
    const dir = tmpBuildYaml({ steps: ['npm install'] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /tools.*must be an array/);
  });

  it('throws on missing steps key', () => {
    const dir = tmpBuildYaml({ tools: [] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /steps.*required/);
  });

  it('throws on non-array non-object steps', () => {
    const dir = tmpBuildYaml({ tools: [], steps: 'bad' });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /steps.*must be/);
  });

  it('throws on empty step string', () => {
    const dir = tmpBuildYaml({ tools: [], steps: ['npm install', ''] });
    const { loadBuildYaml } = require('../src/lib/buildLoader');
    assert.throws(() => loadBuildYaml(dir, 'testmod'), /empty step/);
  });

  it('resolveSteps returns flat steps unchanged', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = ['npm install', 'npm run build'];
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), steps);
  });

  it('resolveSteps returns platform-specific steps', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: ['make'], windows: ['nmake'] };
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), ['make']);
  });

  it('resolveSteps returns null for missing platform', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: ['make'] };
    assert.equal(resolveSteps(steps, 'macos', 'testmod'), null);
  });

  it('resolveSteps returns empty array for empty platform steps', () => {
    const { resolveSteps } = require('../src/lib/buildLoader');
    const steps = { linux: [], windows: ['nmake'] };
    assert.deepEqual(resolveSteps(steps, 'linux', 'testmod'), []);
  });

  it('validateBuildList validates entries and rejects duplicates', () => {
    const { validateBuildList } = require('../src/lib/buildLoader');
    assert.doesNotThrow(() => validateBuildList(['a', 'b', 'c']));
    assert.throws(() => validateBuildList(['a', 'a']), /Duplicate/);
    assert.throws(() => validateBuildList(['a', '']), /non-empty string/);
    assert.throws(() => validateBuildList(['a', 123]), /non-empty string/);
  });
});
