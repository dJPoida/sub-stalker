# AGENTS.md

## Issue tracking policy

- Use GitHub Issues as the single backlog for TODOs, follow-up tasks, and defects.
- Prefer creating issues via the GitHub MCP server instead of leaving untracked inline TODOs.
- When a TODO is found during implementation, either:
  - create a GitHub issue immediately, or
  - link to an existing issue in code/doc comments.

## Task intake and delivery workflow

When the user asks for a task to be done, follow this sequence:

1. Check GitHub Issues for an existing or overlapping issue before starting implementation.
2. If no issue exists, create a new GitHub issue that captures scope and acceptance intent.
3. If the user did not explicitly request execution now, confirm intent before coding:
   - ask whether they want backlog-only issue creation, or
   - immediate implementation.
4. For implementation requests, create a dedicated branch before making code changes.
5. Implement the fix.
6. Commit the changes and push/publish the branch to remote.
7. Open a pull request for review and merge workflow.

## Required setup for AI contributors

- GitHub MCP server must be installed and authenticated before starting feature work.
- The MCP token must include permissions required to create and update issues in this repository.
- If MCP issue creation is unavailable, report that as a blocker in handoff notes and avoid silent backlog loss.
