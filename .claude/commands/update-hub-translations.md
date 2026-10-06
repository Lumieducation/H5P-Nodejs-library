---
description: Sync the H5P Hub content type translations (hub namespace) with the current Hub — regenerate .en.json, translate new/changed strings, run the integrity check, have a subagent review, fix findings.
argument-hint: [locale codes, e.g. "de fr" — default: all locales in the hub directory]
---

# Update the Hub content type translations

Update the translations of the Hub content type metadata in
`packages/h5p-server/assets/translations/hub/` for these locales: $ARGUMENTS

If no locales were given, update every `*.json` in that directory (not `.en.json`).
`es-mx.json` and `es_MX.json` are the same locale — keep their content identical.

Translate **yourself, in context**. Do not use json-autotranslate / `localize.sh`:
it translates string by string without knowing what an H5P content type is.

## Rules

- **Never commit, push or open a PR.** Leave the result in the working tree for the
  human to review.
- **Don't touch unrelated strings.** Only add, change or remove what the English
  diff (step 2) or the integrity check (step 4) requires. Don't "improve" existing
  translations that are still valid — report them instead.
- **Follow each locale's existing conventions** — read the whole locale file before
  writing, and match its tone, formality (du/Sie, tu/vous, …) and terminology.
  Never mix formality levels within a file.
- **Titles:** always write `Translated title (English title)`, using the *current*
  English title from `.en.json` (e.g. `Karteikarten (Dialog Cards)`, `Zeitleiste
  (Timeline)`), so users who know the English H5P name can find the content type.
  Leave out the parenthetical only if the translated title is identical to the English
  one (e.g. `Audio`, `Essay`) or the locale file already treats that name as a
  proper name (e.g. `KewAr-Code`). If the English title itself ends in a
  parenthetical such as `(beta)`, translate it and keep it at the end.
- **Unclear names — research, don't guess.** Many Hub types are small, niche or new
  (Structure Strip, Information Wall, AR Scavenger, Agamotto, Juxtaposition, …). If
  you aren't sure what a name or term means, or how it's called in the target
  language, do a **web search** (WebSearch; WebFetch for the content type's h5p.org
  page or GitHub repo). Also look at the libraries in `test/data/hub-content/*.h5p`
  (unzip into the scratchpad; see each library's `language/<locale>.json`): they
  often contain the authors' own translation of the UI in that locale. Prefer the
  term used there so the Hub text matches what users see in the editor, and search
  for how the concept is called in that language's educational/technical usage.
  List terms you couldn't verify in the final report.
- Keep technical names untranslated: H5P, QR, 3D, Web Speech API, "H5P Hub", content
  type names inside descriptions as they appear in the locale's existing entries.
- Keep line breaks (`\n`), punctuation structure and sentence count of the source;
  don't add or drop information.
- Write JSON with 4-space indent, keys in the same order as `.en.json`, then run
  `npx prettier --write` on the files you changed.

## Steps

### 1. Prepare

1. Run `scripts/worktree-setup.sh` if `node_modules` is missing (it is idempotent).
2. `git status` — if there are unrelated uncommitted changes in the hub directory,
   tell the user and stop; don't stash or discard.
3. `npm run download:content-type-cache` to refresh the Hub data the source file is
   generated from. If the Hub is unreachable, stop and say so — don't fall back to
   stale data silently.

### 2. Regenerate the English source

1. `npm run download:hub-translation-source`
2. `git diff packages/h5p-server/assets/translations/hub/.en.json` — this is your work
   list. Classify every change: **new content type**, **changed text** (meaning
   changed vs. typo/whitespace fix), **renamed key** (e.g. a keyword key), **removed**.
   Typo and whitespace fixes in English don't need a re-translation unless the
   meaning changed.

### 3. Translate

For each locale (use parallel subagents, one per locale, when there are more than
two; give each the English diff, the locale file path and these rules):

1. Read the locale file completely to learn its conventions.
2. New content types: translate title, summary, description and keywords. Use
   the English `description` for context to pick the right terms; the Hub's
   `example` URL or the content type's name may help you understand an unfamiliar one.
   Append them in `.en.json` order.
3. Changed text: update the translation so it matches the new English meaning —
   including the English original in the title parenthetical.
4. Renamed keys: rename the key, keep the translated value.
5. Removed keys: delete them.
6. Also fill gaps the integrity check will report as warnings (missing/empty values).

### 4. Integrity check — loop until clean

Run `npm run check:hub-translations`.

- **Errors** (keys not in `.en.json`, wrong types, invalid JSON): fix them. They are
  never acceptable.
- **Warnings** (missing/empty translations): translate them. If one can't be
  translated meaningfully, leave it and list it in the final report with the reason.

Repeat until there are no errors and no unexplained warnings for the target locales.
(Locales you weren't asked to update may still show warnings — that's expected.)

### 5. Independent review

Spawn a **separate reviewer subagent per updated locale** (parallel,
`subagent_type: general-purpose`). Tell each reviewer to be read-only — it must not
edit files — and give it only: the locale file path, `.en.json`, and `git diff` of
the locale file. Do **not** pass your own translation reasoning; the point is a fresh
look. It should check, for the strings in the diff:

- **Accuracy** — does it say what the English says? Mistranslations, omissions,
  additions, wrong sense of ambiguous words (e.g. "stage", "strip", "panel", "map").
- **Terminology** — consistent with the rest of that file and with established
  H5P terms in that language (look at how sibling content types are named).
- **Tone and formality** — matches the file; no mixing.
- **Title convention** — `Translated (English)` with the English part matching the current title in `.en.json`; no parenthetical only if identical.
- **Mechanics** — no leftover English, grammar/spelling, `\n` and punctuation preserved,
  nothing that looks machine-translated and stiff.

Reviewers report findings as a ranked list: key path, severity (wrong / awkward /
nit), the problem, a suggested replacement. They report only real problems, not
alternative phrasings of equal quality.

### 6. Fix and re-check

Go through every finding and decide on its merits: apply it, or reject it with a
one-line reason (reviewers can be wrong, especially about locale conventions the
file already establishes). Then re-run `npx prettier --write` on changed files and
`npm run check:hub-translations`. If you changed more than nits, run one more review
round on the affected locales.

### 7. Report

Give the user, concisely:

- which locales were updated and what changed (new types, changed texts, renamed keys),
- final `check:hub-translations` result,
- findings you rejected and why,
- anything needing a human decision (unsure terms, warnings left on purpose, existing
  translations that look wrong but were out of scope).

Don't paste whole files; the user will read `git diff`.
