# Project State

This directory contains persistent context for the FieldOps project, so that
a new Claude Code session (or a different machine/collaborator) can continue
work without depending on the history of a prior chat session.

## Files

### backend-audit.md
Result of the most recent full backend-vs-documentation audit: which
documented features are implemented, partial, missing, untested, or
implemented-but-not-integrated, with concrete evidence (files, endpoints,
tests). Superseded audits should be marked as superseded, not deleted.

### pending-features.md
Current backlog of confirmed pending backend features (BF-xxx), derived from
`backend-audit.md`. This is the actionable list — check here before picking
up backend work.

### progress.md
Current project execution state: what has recently landed (with commit/branch
references), what audit was last run, and the recommended next task.

### decisions.md
Important technical decisions and their rationale, so a future session
understands *why* something is the way it is, not just *what* it is.

## Rules

These files are persistent project context.

Do not delete historical information without a reason.

Do not treat assumptions as facts.

When information becomes outdated, mark it as superseded instead of silently
deleting it.

Source-of-truth hierarchy when these files conflict with something else
(see `CLAUDE.md` §3-4 for the full rule):

1. Code + current tests — what is actually implemented.
2. `./docs/**` — what is required.
3. Audits/reports (this directory's `backend-audit.md`) — findings from past analysis.
4. `project-state/**` (this directory) — current operational state.
5. Git history — how things got here.

If two sources disagree, record the disagreement explicitly (in
`decisions.md` or as a "Divergência" entry) instead of silently picking one.
