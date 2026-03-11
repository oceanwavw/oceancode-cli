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

function getRequiredTools(config, targets) {
  const tools = [];
  for (const t of targets) {
    const list = (config.preflight_tools || {})[t] || [];
    for (const tool of list) {
      if (!tools.includes(tool)) tools.push(tool);
    }
  }
  // Add cargo if any local_packages have rust_extension and backends is in targets
  if (targets.includes('backends')) {
    const hasRust = (config.local_packages || []).some(p => p.rust_extension);
    if (hasRust && !tools.includes('cargo')) {
      tools.push('cargo');
    }
  }
  return tools;
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

async function runPreflight(config, targets) {
  const tools = getRequiredTools(config, targets);
  const missing = [];

  for (const tool of tools) {
    if (checkTool(tool)) {
      console.log(`[OK] ${tool}`);
    } else {
      missing.push(tool);
    }
  }

  if (missing.length === 0) return true;

  for (const tool of missing) {
    const installInfo = (config.tool_install || {})[tool];
    if (!installInfo) {
      console.error(`ERROR: ${tool} not found and no install info configured`);
      return false;
    }
    const ok = await promptInstall(tool, installInfo);
    if (!ok) return false;
    console.log(`[INSTALLED] ${tool}`);
  }

  return true;
}

module.exports = { checkTool, getRequiredTools, promptInstall, runPreflight };
