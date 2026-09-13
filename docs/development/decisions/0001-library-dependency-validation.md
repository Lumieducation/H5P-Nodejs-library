---
title: Handling packages whose library dependencies can't be resolved
group: Documents
category: Contributing
---

# 1. Handling packages whose library dependencies can't be resolved

Date: 2026-09-13

Status: proposed

## Context

A share of the packages on the H5P Hub declare library dependencies that they
do not ship themselves. H5P resolves dependencies by exact major.minor version,
so on a system that doesn't already have those exact versions installed the
editor cannot assemble the dependency tree. `H5PEditor.listAssets` throws
`library-missing` and `action=libraries` answers 404.

Verified by installing each package into an empty system and then calling
`getLibraryData` for its main library:

| Package                                    | Unsatisfied dependency                            |
| ------------------------------------------ | ------------------------------------------------- |
| Arts of Europe (hub content)               | `H5P.Question-1.5`, `H5PEditor.ColorSelector-1.2`  |
| Making a strawberry smoothie (hub content) | `H5PEditor.ColorSelector-1.2`                      |
| `H5P.BranchingScenario.h5p` (content type) | `H5P.InteractiveVideo-1.27`                        |

The packages ship a *different* version of a shared editor library than their
own older libraries require — newer (`H5PEditor.ColorSelector 1.3` shipped,
`1.2` required) or older (`H5P.Question 1.4` shipped, `1.5` required). On
h5p.org this goes unnoticed because those sites have every version installed
side by side; on a fresh h5p-nodejs-library system it does not.

None of this is currently detected. The packages install without complaints and
break later, and `h5peditor.js` only logs the failing request's status text to
the browser console, so the user sees a "successfully imported" banner followed
by a blank editor.

This leaves a genuine tension, and it is what this decision is about:

- **Diagnosability.** The failure has to become visible. Today it is invisible
  to everyone but whoever reads the browser console or the server log.
- **Hub compatibility.** Whatever we do must not make the Hub, which is the
  main source of content for most installations, substantially less usable —
  and these packages are not exotic edge cases.

Every option below buys one at the expense of the other. There is no option
that makes the affected packages editable on a fresh system without changing
how H5P resolves dependencies.

## Options

### A. Refuse the package at import time

Validate the dependency graph before installing and fail with one error per
unsatisfied dependency.

- Diagnosability: **best.** The failure happens at the moment the user acts,
  and it names the cause.
- Hub compatibility: **worst.** `H5P.BranchingScenario` can no longer be
  installed from the content type hub on a fresh system at all, and a share of
  Content Hub content is refused outright. What is lost is content that could
  not be edited anyway — but "refused" also means the user can't import it to
  merely view or export it, which today they can.
- Parity: matches the H5P PHP core, which performs the same check and reports
  `missing-required-library` (`h5p.classes.php:1078`).
- Bonus: `missing-required-library` is the *only* error code the H5P hub client
  renders as text; everything else collapses to "Something went wrong. Please
  try again." Choosing it means the reason reaches the user without touching
  the externally maintained client. The client does prepend its own hardcoded
  and, in our case, misleading sentence ("You are not authorized to install or
  update the libraries required by this content"), which cannot be changed from
  the server side.

### B. Import, but report the unsatisfied dependencies

Log them, attach them to the response, let the import proceed.

- Diagnosability: **unchanged in practice.** The editor still ends up blank,
  and the success path has no channel in which the H5P client would display a
  warning. It helps whoever reads the server log — which is exactly who is
  already served today.
- Hub compatibility: **best.** Nothing that works today stops working.

### C. Resolve dependencies leniently

Accept an installed library with the same major and a higher or equal minor
version as satisfying a dependency. H5P's versioning policy makes minor
versions backwards compatible.

- Diagnosability: irrelevant for the cases it covers, because they stop being
  failures. The cases it does not cover stay as invisible as today.
- Hub compatibility: **best of the options that actually fix something.** It
  resolves the `ColorSelector 1.3 satisfies 1.2` class — the most common one —
  and keeps that content editable rather than merely diagnosable.
- Cost: it does not help when the package ships an *older* version than
  required (`H5P.Question`), so a check is still needed for the remainder. It
  changes dependency resolution everywhere (`listAssets`,
  `getNotInstalledLibraries`, exports) and diverges from the PHP core, so the
  same package could behave differently here and on h5p.org.

### D. Surface editor AJAX errors in the client

The 404 already carries a precise message that `h5peditor.js` drops. A script
added through `config.customization.global.editor.scripts` runs in the same
window as the hub client and can display it (verified in a prototype).

- Diagnosability: **good, and broader than the others.** It also covers
  unrelated cases where a server message is lost the same way — for example a
  content file rejected by `validateContentBytes` during a hub import.
- Hub compatibility: unchanged.
- Cost: does not stop a broken package from being installed; the user learns
  the reason only after ending up in a broken editor. Orthogonal to A–C rather
  than an alternative to them.

## Decision

Take option **A**, accepting the loss of Hub compatibility in exchange for
diagnosability and parity with the PHP core.

The reasoning is that the compatibility being given up is largely nominal: the
affected packages cannot be edited on a fresh system either way, and the Hub's
"use content" flow exists to put the user in the editor. Trading an import that
silently produces an unusable editor for a refusal that names the missing
libraries is a better default, and it is the behaviour users coming from the
PHP implementation expect.

This is a default, not a ceiling. Option D remains worth doing on its own
merits and would make the remaining silent-failure cases visible. Option C is
the escape hatch if refusing Hub content turns out to be too disruptive in
practice — it is the only option that would make the affected content work
rather than merely fail clearly, and it can be adopted later without undoing A.

## Consequences

- Packages with unsatisfiable dependencies fail at import with one
  `missing-required-library` error per missing library, rendered as a list by
  the stock hub client, preceded by that client's misleading "not authorized"
  sentence.
- `H5P.BranchingScenario` is no longer installable from the content type hub on
  a fresh system; some Content Hub content is refused. Users who need it must
  first install a package that provides the missing libraries — install order
  now matters.
- Support load shifts: reports change from "the editor is blank" to "it says a
  library is missing", which is actionable without access to the server log.
- Two integration tests installed all Hub packages into one system and relied on
  later packages providing earlier ones' dependencies; they now retry failed
  packages after the others (`test/helpers/installPackages.ts`). The package
  export round-trip test skips `H5P.BranchingScenario.h5p`, which can no longer
  be imported standalone — coverage lost for that package.
- If option C is adopted later, this decision is superseded rather than
  reversed: the check stays, but fewer packages trip it.
