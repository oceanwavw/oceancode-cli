# Project Big Picture

## Overview
Utility scripts repository for the oceanwave project. Contains build scripts, git automation, and configuration helpers.

## Users / Consumers
Developers on the team.

## Tech Stack
- Shell scripts (bash/bat) for git automation and build helpers
- Node.js for structured CLI tools (sync_repo.js — uses micromatch, fs-extra)

## Architecture
- Standalone shell scripts at the root for simple automation (git, build, install)
- `sync_repo.js` is a structured Node.js CLI with `lib/`, `test/`, and npm dependencies
- Dev/prod sync workflow: `.prodinclude` allowlist in dev repos, bidirectional sync via `dev2prod`, `prod2dev`, `prune` commands

## Conventions & Constraints
- Keep scripts simple and modular.
- Node.js tools use TDD with `node:test`, no external test framework.
