---
title: Validating library dependencies when importing packages
group: Documents
category: Contributing
---

# 1. Validating library dependencies when importing packages

Date: 2026-09-13

Status: proposed

## Context

Importing "Arts of Europe - Branching scenario" from the H5P Content Hub
appeared to fail silently: the editor showed a green "successfully imported"
banner and then stayed blank.

The import itself succeeded. What failed was the request right after it:

```text
GET /h5p/ajax?action=libraries&machineName=H5P.BranchingScenario&majorVersion=1&minorVersion=4
→ 404 {"errorCode":"","httpStatusCode":404,
       "message":"The library H5P.Question-1.5 is not installed on this system.","success":false}
```

`H5PEditor.listAssets` walks the editor dependency tree of the main library and
throws `library-missing` when a library can't be resolved. `h5peditor.js` only
logs the status text of a failed AJAX request to the browser console, so
nothing reaches the user.

The cause is the package itself. It ships `H5P.Summary 1.10` and
`H5P.SingleChoiceSet 1.11`, both of which declare
`preloadedDependencies: H5P.Question 1.5`, but it only bundles
`H5P.Question 1.4.10`. H5P resolves dependencies by exact major.minor version,
so the tree is unsatisfiable. Until now `PackageValidator` never checked this:
`PackageImporter` only verified the dependencies declared in the content's own
`h5p.json` (`install-missing-libraries`), not the dependencies the libraries
declare among themselves.

This is not limited to one package. Verified by installing each package into an
empty system and then calling `getLibraryData` for its main library:

| Package                                 | Unsatisfied dependency                              |
| --------------------------------------- | --------------------------------------------------- |
| Arts of Europe (hub content)            | `H5P.Question-1.5`, `H5PEditor.ColorSelector-1.2`    |
| Making a strawberry smoothie (hub content) | `H5PEditor.ColorSelector-1.2`                     |
| `H5P.BranchingScenario.h5p` (content type) | `H5P.InteractiveVideo-1.27`                       |

In all three cases the package installs without complaints today and the editor
then fails to load. The packages ship a different version of a shared editor
library than their own older libraries require — either newer
(`H5PEditor.ColorSelector 1.3` shipped, `1.2` required) or older
(`H5P.Question 1.4` shipped, `1.5` required). On h5p.org this goes unnoticed
because those sites already have every version installed side by side.

The H5P PHP core checks this at install time and reports every unsatisfied
dependency with the error code `missing-required-library`
(`h5p.classes.php:1078`). That code matters beyond parity: the H5P hub client
discards server error messages unless the response carries a `details` array
containing an item with exactly that code, in which case it renders every
item's message as a bulleted list. Every other error collapses to
"Download failed — Something went wrong. Please try again."

## Decision

`PackageValidator` gets a `libraryDependenciesMustBeSatisfied` rule, applied
whenever libraries are installed from a package. It collects the
`preloaded`, `editor` and `dynamic` dependencies of every library in the
package and reports each one that is neither shipped in the package nor
already installed as a `missing-required-library` error on the
`AggregateH5pError`. `expressErrorHandler` already converts those into
`details: [{code, message}]`, so the hub client displays them without any
change to the (externally maintained) client code.

## Consequences

The failure moves from "editor 404s at some later point, visible only in the
browser console" to "import fails with a message naming the missing
libraries". The user sees:

```text
Download failed
You are not authorized to install or update the libraries required by this content.
  • Missing required library H5P.Question-1.5
  • Missing required library H5PEditor.ColorSelector-1.2
```

The introductory sentence is the hub client's own hardcoded text for
`missing-required-library` and is misleading here — it is not an authorization
problem. It cannot be changed from the server side, and any other error code
loses the list entirely.

Packages that are only installable once another package has provided their
dependencies now depend on install order. `H5P.BranchingScenario` can no longer
be installed from the content type hub on a fresh system at all, and a share of
the content on the Content Hub is refused. Both were already unusable in the
editor; what changes is that the user is told why. Two integration tests that
installed all Hub packages into one system relied on later packages providing
earlier ones' dependencies and now retry failed packages after the others
(`test/helpers/installPackages.ts`); the package export round-trip test skips
`H5P.BranchingScenario.h5p`, which can no longer be imported standalone.

## Options considered

### Report the rejection but keep importing

Log the unsatisfied dependencies and let the import proceed. Nothing visible
changes for the user — the editor still ends up blank — so this does not solve
the reported problem. Rejected.

### Resolve dependencies leniently

Treat a dependency as satisfied by an installed library with the same major and
a higher or equal minor version. H5P's versioning policy makes minor versions
backwards compatible, so this would fix the `ColorSelector 1.3 satisfies 1.2`
class of failures and keep most Hub content importable. It would not help where
the package ships an *older* version than required (`H5P.Question`), and it
requires changing how dependencies are resolved everywhere (`listAssets`,
`getNotInstalledLibraries`), diverging from the PHP core. Worth revisiting if
refusing Hub content turns out to be too disruptive; out of scope here.

### Surface the message in the editor instead of failing the import

The 404 from `action=libraries` carries a precise message that `h5peditor.js`
drops. A script added through `config.customization.global.editor.scripts` runs
in the same window as the hub client and can display the message (verified in a
prototype). This addresses the general "editor swallows AJAX errors" problem —
including the unrelated case of a content file rejected by
`validateContentBytes` during a hub import, where the server message is lost
the same way — but it does not stop a broken package from being installed.
Complementary rather than an alternative; not implemented here.
