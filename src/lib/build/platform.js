'use strict';

const path = require('path');

function getPlatform() {
  switch (process.platform) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

function getPlatformKey() {
  return getPlatform();
}

function getVenvBin(venvPath) {
  if (getPlatform() === 'windows') {
    return path.join(venvPath, 'Scripts', 'python.exe');
  }
  return path.join(venvPath, 'bin', 'python');
}

function getBinDir() {
  const map = { linux: 'bin/linux', macos: 'bin/macos', windows: 'bin/win' };
  return map[getPlatform()];
}

function getBinExt() {
  return getPlatform() === 'windows' ? '.exe' : '';
}

function getScriptExt() {
  return getPlatform() === 'windows' ? '.bat' : '.sh';
}

module.exports = { getPlatform, getPlatformKey, getVenvBin, getBinDir, getBinExt, getScriptExt };
