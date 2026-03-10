# Proposal: sync_repo

Replace the hardcoded 21-step `sync_to_prod.bat` with a generic, config-driven Node.js CLI (`sync_repo.js`) for bidirectional sync between dev and prod repos. Uses an allowlist model (`.prodinclude`) so new dev artifacts are excluded by default, with direction guards via marker files and a safe delete-list workflow for handling removals.
