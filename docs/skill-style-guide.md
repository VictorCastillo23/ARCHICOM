# Skill Style Guide (Vitrina)

Normative source for creating or refactoring skills in this repo. A skill is a **runtime instruction contract for an LLM**, not human-facing documentation: it tells the model when to activate, what rules are non-negotiable, how to decide, what to do, and what to return.

> Living project documentation lives under `docs/` (see `Vitrina_BD_Conexion_Backend.md`, `Vitrina_Especificaciones_APIs.md`, `Vitrina_Pantallas_Componentes.md`, `Vitrina_Estado_Proyecto.md`) — renamed from `prompts/` so `skill-creator`'s own path check (`docs/skill-style-guide.md`) picks this file up automatically. Adapted from the bundled guide in `skill-creator`'s `references/`.

## Where skills live in this repo

- **Directory convention:** `.agents/skills/{skill-name}/SKILL.md` — not `skills/{skill-name}/SKILL.md`. See the existing skills for the pattern (`next-best-practices`, `find-skills`, `skill-creator`, `supabase`, `vitrina-component-design`, etc.).
- **Two kinds of skill, two registries:**
  - **Externally installed** (via `pnpm dlx skills add`) → tracked in `skills-lock.json` with `source`/`sourceType`/`computedHash`. Don't hand-edit hashes.
  - **Locally authored** (written for this project, no upstream source) → **not** added to `skills-lock.json` (that file is only for CLI-managed provenance). Register it instead as a row in the Skills table of `CLAUDE.md`.
- Every skill — installed or local — gets one row in `CLAUDE.md`'s Skills table: name, path link, and a Spanish one-line description of when it activates.

## Required Structure

Every `SKILL.md` MUST use this order unless a section is truly irrelevant:

1. **Frontmatter** — complete metadata for skill discovery.
2. **Activation Contract** — exact situations that load the skill.
3. **Hard Rules** — constraints the LLM MUST NOT violate.
4. **Decision Gates** — short tables or bullets for branching choices.
5. **Execution Steps** — ordered operational workflow.
6. **Output Contract** — required final format or artifacts.
7. **References** — local files only; supporting detail lives outside the skill.

## Frontmatter Rules

- `description` MUST be one physical line, YAML-safe, and quoted.
- Put trigger words first: `"Trigger: ... . {What the skill does}."`
- `description` SHOULD be ≤160 chars and MUST be ≤250 chars.
- Include `name`, `description`, `license`, `metadata.author`, `metadata.version`.
- Do NOT add a `Keywords` section; discovery uses frontmatter.

## Body Budget

- Target **180–450 tokens**. Recommended max **700**. Hard max **1000**.
- Move examples, schemas, and background into `assets/` or `references/` inside the skill's own folder.

## Writing Rules

**DO:** imperative runtime instructions ("Load X", "Check Y", "Return Z"); lead with activation trigger and hard constraints; compact decision tables; minimal executable examples; link to local files for detail.

**DON'T:** explain history/motivation/tutorial background; duplicate long docs inline; add generic advice the LLM can't execute; link external URLs as primary references; bury critical rules below examples.

## Quality Gates (before considering a skill done)

- Frontmatter complete, quoted, single-line, trigger-preserving.
- Required sections present, in order.
- Hard rules are testable/observable (not vague preferences).
- Decision gates cover real forks only — no table for a single option.
- Output contract tells the LLM exactly what to return.
- References point to local files that actually exist in this repo.
- If the skill documents this project's own conventions (like `vitrina-component-design`), verify claims against the actual current code — don't describe a pattern that isn't really used.

## Refactor Checklist

- [ ] Move explanatory prose to local references.
- [ ] Collapse repeated rules into one hard rule.
- [ ] Replace prose branches with a decision table.
- [ ] Trim examples to the smallest useful case.
- [ ] Recheck description length and trigger words.
- [ ] Confirm the `CLAUDE.md` Skills table row still matches reality.
