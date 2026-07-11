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
- End-of-session ship steps (Synology deploy script; note merge→`main` auto-deploys the EC2
  demo) are deploy-specific and live in the gitignored `CLAUDE.local.md`, not this committed shim.
