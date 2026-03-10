'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('backends builder', () => {
  it('buildVenvCmd returns correct uv venv command', () => {
    const { buildVenvCmd } = require('../src/lib/build/backends');
    const cmd = buildVenvCmd('/tmp/venv', '3.12');
    assert.equal(cmd, 'uv venv "/tmp/venv" --python "3.12"');
  });

  it('buildPipInstallCmd returns correct uv pip install command', () => {
    const { buildPipInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildPipInstallCmd('/tmp/venv/bin/python', ['numpy', 'pandas']);
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" numpy pandas');
  });

  it('buildLocalInstallCmd handles extras', () => {
    const { buildLocalInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildLocalInstallCmd('/tmp/venv/bin/python', '/workspace/lib/pkg', '[server]');
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" -e "/workspace/lib/pkg[server]"');
  });

  it('buildLocalInstallCmd handles no extras', () => {
    const { buildLocalInstallCmd } = require('../src/lib/build/backends');
    const cmd = buildLocalInstallCmd('/tmp/venv/bin/python', '/workspace/lib/pkg', null);
    assert.equal(cmd, 'uv pip install --python "/tmp/venv/bin/python" -e "/workspace/lib/pkg"');
  });

  it('buildVerifyCmd returns python import check', () => {
    const { buildVerifyCmd } = require('../src/lib/build/backends');
    const cmd = buildVerifyCmd('/tmp/venv/bin/python', 'mypkg');
    assert.equal(cmd, '"/tmp/venv/bin/python" -c "import mypkg"');
  });
});
