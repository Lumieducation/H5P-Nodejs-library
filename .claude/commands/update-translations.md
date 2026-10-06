---
description: Sync the translations of the server's language namespaces (client, server, metadata-semantics, …) with their English source — find new/changed strings, translate them, run the integrity check, have a subagent review, fix findings.
argument-hint: [namespaces and locale codes, e.g. "server client de fr" — default: all namespaces except hub, all locales]
---

# Update the translations

Update the translations in `packages/h5p-server/assets/translations/` for these
arguments: $ARGUMENTS

Arguments are namespace (directory) names and/or locale codes, in any order. If no
namespaces were given, update every namespace except `hub` (that one has its own
command, `/update-hub-translations`). If no locales were given, update every
`<locale>.json` in the namespaces. The English source of a namespace is `en.json`
(`.en.json` for `library-metadata`).
`es-mx.json` and `es_MX.json` are the same locale — keep their content identical
where both exist.

Translate **yourself, in context**: a string-by-string translation service doesn't
know what these strings are used for (error messages shown to editors, UI labels in
the H5P player, titles of content type libraries, …).

## Rules

- **Never commit, push or open a PR.** Leave the result in the working tree for the
  human to review.
- **Don't touch unrelated strings.** Only add, change or remove what the English
  changes (step 2) or the integrity check (step 4) require. Don't "improve" existing
  translations that are still valid — report them instead.
- **Follow each locale's existing conventions** — read the whole locale file of the
  namespace (and the same locale in the sibling namespaces) before writing, and match
  its tone, formality (du/Sie, tu/vous, …) and terminology. Never mix formality
  levels within a file. Use the terms the H5P translations of that language use; the
  `client`, `copyright-semantics` and `metadata-semantics` namespaces mirror H5P
  core wording (see the core rule below), so keep terms like "Rights of use" or
  "Embed" consistent with what the locale already uses there.
- **Strings that originate in H5P core.** The English text of `client`,
  `copyright-semantics` and `metadata-semantics` is copied from H5P core
  (`h5p.classes.php` and the metadata semantics in
  `packages/h5p-examples/h5p/core/`, downloaded by `npm run download:h5p`), and H5P
  itself translates them elsewhere (Transifex, `translate.h5p.org`), so the
  official wording may differ from what you'd write. Before translating one of these
  strings, in this order:
    1. Look for the same English text (keys differ, match by text) in the editor's
       `packages/h5p-examples/h5p/editor/language/<locale>.js` (and the matching
       `en.js`), and in the `language/<locale>.json` of the libraries in
       `test/data/hub-content/*.h5p` (e.g. `H5PEditor.*`, `H5P.Image`). If an official
       translation exists, use it **verbatim** (convert `:placeholder` / quoting
       only if the source string differs in that way). Beware of short generic
       words such as "Title" — only reuse a match whose meaning in context is the
       same.
    2. Otherwise search the web for the official H5P translation of that string
       (e.g. the h5p-php-library and plugin repos, translate.h5p.org); reuse it if you
       find it.
    3. Otherwise translate it yourself, following the locale's existing wording for
       the same concept in the other namespaces, and list it in the final report as
       "not verified against H5P core".
  Don't reword strings that are already translated just because an official
  variant exists — report the difference.
- **Preserve everything that is not prose, byte for byte:**
    - i18next placeholders `{{name}}` (same names, same count — the check enforces this; always keep them),
    - `:title`, `:url`-style tokens and HTML such as `<strong>…</strong>` or
      `<a href=':url' target='_blank'>…</a>` — translate only the text between tags,
    - `\n` line breaks and the punctuation structure/sentence count of the source.
- **Plural keys** (`*_one`, `*_other`): translate each form and keep the source's
  plural keys. Additionally add the forms the language needs according to the CLDR
  plural rules (`_zero`, `_two`, `_few`, `_many`), e.g. `_one`, `_few`, `_many`,
  `_other` for Russian or Polish; the check accepts them. `{{count}}` may be
  spelled out in words in `_zero`/`_one`/`_two` forms ("Eine Bibliothek"); the
  check ignores it there, in all other forms it is mandatory.
- Keep technical names untranslated: H5P, H5P Hub, MongoDB, S3, ClamAV, API names,
  file extensions, library machine names (`H5P.Image`).
- **Unclear terms — research, don't guess.** If you don't know how a term is called in
  the target language's H5P/educational/IT usage, do a **web search** (WebSearch;
  WebFetch for h5p.org or the H5P GitHub repos). Other places that show how a
  language names things: the libraries in `test/data/hub-content/*.h5p` (unzip into
  the scratchpad; each library's `language/<locale>.json` holds the authors' own UI
  translation) and the other namespaces of the same locale. List terms you couldn't
  verify in the final report.
- **`library-metadata`** holds plain titles of libraries (e.g. `Bild`), not the
  hub's `Translated title (English title)` format. Keep them consistent with how
  that locale names the same content types in `hub` and in the libraries' own UI.
- Write JSON with 4-space indent, keys in the same order as the English source, then
  run `npx prettier --write` on the files you changed.

## Steps

### 1. Prepare

1. Run `scripts/worktree-setup.sh` if `node_modules` is missing (it is idempotent).
2. `git status` — if there are unrelated uncommitted changes in the target
   directories (apart from the English source files, which may legitimately be
   edited right now), tell the user and stop; don't stash or discard.

### 2. Find the work

1. Missing, empty, invalid and stale keys:
   `npm run check:translations -- <namespaces> --locale=<locales>`. Always pass the
   namespaces explicitly (without namespace arguments the check includes `hub`);
   if the user gave none, pass every directory except `hub`. `--locale` is optional
   and takes a comma-separated list. Warnings are keys still to translate, errors
   are things to fix (see step 4).
2. Changed English text whose translations still reflect the _old_ meaning is
   invisible to the check, and the English change may already be on `master`.
   For each locale file find the commit that last touched it:
   `git log -1 --format=%H -- packages/h5p-server/assets/translations/<ns>/<locale>.json`,
   then
   `git diff <that commit> -- packages/h5p-server/assets/translations/<ns>/en.json`
   (`.en.json` for `library-metadata`). Do this for each locale you update, since
   locales were last updated at different times (the user may name a different
   base ref). Classify every changed key: **new**, **changed text** (meaning
   changed vs. typo/whitespace fix), **renamed key**, **removed**. Typo and
   whitespace fixes in English don't need re-translation.

### 3. Translate

For each locale (use parallel subagents, one per locale, when there are more than
two; give each the work list, the namespaces, the file paths and these rules):

1. Read the locale's file(s) for the namespace(s) completely to learn the conventions.
2. New/missing keys: translate them and insert them in English-source order.
3. Changed text: update the translation so it matches the new English meaning.
4. Renamed keys: rename the key, keep the translated value (re-translate if the
   meaning changed too).
5. Removed keys: delete them.
6. Check each value you write against the source: same placeholders, same tags,
   same number of sentences.

### 4. Integrity check — loop until clean

Run `npm run check:translations -- <namespaces> --locale=<locales>` (namespaces as in
step 2).

- **Errors** (keys not in the source, wrong types, placeholder mismatches, invalid
  JSON): fix them. Stale keys that no longer exist in English are deleted;
  placeholders are restored in the translation. Errors are never left in files you
  were asked to update.
- **Warnings** (missing/empty translations): translate them. If one can't be
  translated meaningfully, leave it and list it in the final report with the reason.

Repeat until there are no errors and no unexplained warnings for the target
locales and namespaces. (Others may still show findings — that's expected.)

### 5. Independent review

Spawn a **separate reviewer subagent per updated locale** (parallel,
`subagent_type: general-purpose`). Tell each reviewer to be read-only — it must not
edit files — and give it only: the locale's file paths, the English source files, and
the `git diff` of the locale files. Do **not** pass your own translation reasoning;
the point is a fresh look. It should check, for the strings in the diff:

- **Accuracy** — does it say what the English says? Mistranslations, omissions,
  additions, wrong sense of ambiguous words.
- **Terminology** — consistent with the rest of that locale (all namespaces) and with
  established H5P terms in that language.
- **Tone and formality** — matches the file; no mixing.
- **Mechanics** — placeholders, tags and `\n` intact; plural forms right for the
  language; no leftover English; grammar/spelling; nothing that reads
  machine-translated and stiff.

Reviewers report findings as a ranked list: namespace and key, severity (wrong /
awkward / nit), the problem, a suggested replacement. They report only real
problems, not alternative phrasings of equal quality.

### 6. Fix and re-check

Go through every finding and decide on its merits: apply it, or reject it with a
one-line reason (reviewers can be wrong, especially about conventions the file
already establishes). Then re-run `npx prettier --write` on changed files and
`npm run check:translations -- <namespaces>`. If you changed more than nits, run one more review
round on the affected locales.

### 7. Report

Give the user, concisely:

- which namespaces and locales were updated and what changed (new, changed, renamed,
  removed keys),
- final `check:translations` result for the targets,
- which core-origin strings were taken from official H5P translations and which were
  translated without verification,
- findings you rejected and why,
- anything needing a human decision (unsure terms, warnings left on purpose, existing
  translations that look wrong but were out of scope).

Don't paste whole files; the user will read `git diff`.
