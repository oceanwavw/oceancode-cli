'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('platform helpers', () => {
  it('getPlatform returns linux, macos, or windows', () => {
    const { getPlatform } = require('../src/lib/build/platform');
    const p = getPlatform();
    assert.ok(['linux', 'macos', 'windows'].includes(p));
  });

  it('getVenvBin returns correct path for platform', () => {
    const { getVenvBin, getPlatform } = require('../src/lib/build/platform');
    const bin = getVenvBin('/tmp/venv');
    const p = getPlatform();
    if (p === 'windows') {
      assert.ok(bin.endsWith('Scripts\\python.exe'));
    } else {
      assert.ok(bin.endsWith('bin/python'));
    }
  });

  it('getBinDir returns platform-specific dir', () => {
    const { getBinDir, getPlatform } = require('../src/lib/build/platform');
    const dir = getBinDir();
    const p = getPlatform();
    const expected = { linux: 'bin/linux', macos: 'bin/macos', windows: 'bin/win' };
    assert.equal(dir, expected[p]);
  });

  it('getBinExt returns .exe on windows, empty otherwise', () => {
    const { getBinExt, getPlatform } = require('../src/lib/build/platform');
    const ext = getBinExt();
    const p = getPlatform();
    assert.equal(ext, p === 'windows' ? '.exe' : '');
  });

  it('getScriptExt returns .bat on windows, .sh otherwise', () => {
    const { getScriptExt, getPlatform } = require('../src/lib/build/platform');
    const ext = getScriptExt();
    const p = getPlatform();
    assert.equal(ext, p === 'windows' ? '.bat' : '.sh');
  });

  it('getPlatformKey maps platform to config keys', () => {
    const { getPlatformKey, getPlatform } = require('../src/lib/build/platform');
    const key = getPlatformKey();
    const p = getPlatform();
    assert.equal(key, p);
  });
});
