'use strict';

const { execSync } = require('child_process');
const { getPlatform } = require('./platform');
const readline = require('readline');

function checkTool(name) {
  try {
    const cmd = getPlatform() === 'windows' ? `where ${name}` : `which ${name}`;
    execSync(cmd, { stdio: ['pipe', 'pipe', 'pipe'], shell: true });
    return true;
  } catch {
    return false;
  }
}

async function promptInstall(toolName, installInfo) {
  const platform = getPlatform();
  const autoCmd = installInfo.auto && installInfo.auto[platform];

  if (!autoCmd) {
    console.error(`ERROR: ${toolName} not found. Install from ${installInfo.url}`);
    return false;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  const answer = await new Promise(resolve => {
    rl.question(`${toolName} not found. Install it? [y/N] `, resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.error(`${toolName} required. Install from ${installInfo.url}`);
    return false;
  }

  try {
    console.log(`Installing ${toolName}...`);
    execSync(autoCmd, { stdio: 'inherit', shell: true });
    return checkTool(toolName);
  } catch {
    console.error(`Failed to install ${toolName}. Install manually from ${installInfo.url}`);
    return false;
  }
}

module.exports = { checkTool, promptInstall };
