#!/usr/bin/env node
'use strict';

const path = require('path');

const GROUPS = {
  sync: path.join(__dirname, '..', 'src', 'commands', 'sync'),
  git: path.join(__dirname, '..', 'src', 'commands', 'git'),
  install: path.join(__dirname, '..', 'src', 'commands', 'install'),
  build: path.join(__dirname, '..', 'src', 'commands', 'build'),
  launch: path.join(__dirname, '..', 'src', 'commands', 'launch'),
};

const group = process.argv[2];
if (!group || !GROUPS[group]) {
  console.error('Usage: oceancode <sync|git|install|build|launch> [action] [args] [flags]');
  console.error('');
  console.error('Command groups:');
  console.error('  sync      Sync repos between dev and prod');
  console.error('  git       Git operations across repos');
  console.error('  install   Clone repos from a git server');
  console.error('  build     Build backend, frontend, and CLI packages');
  console.error('  launch    Launch applications (dev or prod mode)');
  process.exit(1);
}

require(GROUPS[group]).run(process.argv.slice(3));
