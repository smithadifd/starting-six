# CLAUDE.md — Starting Six (Claude Code)

@AGENTS.md

Everything about Starting Six — stack, commands, repo map, architecture, database, conventions, and
the critical gotchas (live EC2 auto-deploy on `main`, demo-mode blocking in `proxy.ts`, hardcoded
Gen 9 type chart) — lives in the imported [`AGENTS.md`](AGENTS.md). It's tool-agnostic and
self-contained; read it first. Personal/secret config lives in the gitignored `CLAUDE.local.md`
(shape in `CLAUDE.local.md.example`).

## Notes for Claude

- Custom agents in `.claude/agents/` (invoke `/agent <name>`): `phase-implementer`, `ui-builder`,
  `db-assistant`, `pre-commit-check`, `code-reviewer`, `plan-generator`. Each reads `AGENTS.md` for
  project context.
- **Additive-caution:** merging to `main` auto-deploys to the public EC2 demo within ~5 min (AGENTS.md
  gotchas). Never push to `main` directly; never touch workflows, build config, or the `demo-infra/`
  scripts the EC2 cron consumes without explicit sign-off.
- Run `/review` (or the `code-reviewer` agent) on the diff before declaring work done; apply
  mechanical fixes silently, surface real questions.
- Conventional commits; never auto-push; confirm before destructive ops. No emojis unless asked.

## End-of-session workflow

1. **Branch** off `main` (`feat/…`, `fix/…`) — public repo, no direct pushes.
2. **Commit** staged files with a Conventional Commit message.
3. **Push** `git push -u origin <branch>`, then `gh pr create` (summary + test plan).
4. **CI** `gh run watch <run-id> --exit-status`.
5. **Merge** `gh pr merge <n> --squash --delete-branch`; then `git checkout main && git pull`.
6. **Deploy** — merging to `main` auto-deploys to the demo; the Synology deploy is `./scripts/deploy.sh`.
7. **Docs** update `MEMORY.md` and this file if status changed.
