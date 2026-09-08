# Selectors

Documents every selector used by `test/pages/*.ts`, which frame it lives in,
and which core version it was verified against. If the H5P core or editor
client is upgraded (see `scripts/install.sh` for the pinned commit hashes)
and a spec starts failing, check this file first to see whether the DOM
structure changed.

Verified against:

- H5P core (`h5p-php-library`): commit `2aeb0b83fa603e331381b3a6b8bf42c3773ba140`
  (see `packages/h5p-examples/download-core.sh`), reporting itself as
  version `1.28.0` in script query strings.
- H5P editor client (`h5p-editor-php-library`): commit
  `ab2daa18bd61b19e7f8729e22eec88f3b637a868`.
- Content type used for discovery: H5P.Blanks 1.14.13
  (`test/data/hub-content/H5P.Blanks.h5p`).

Discovery method: started the app with `npm start`, installed H5P.Blanks via
`POST /h5p/ajax?action=library-upload`, and drove a real Chromium instance
with Playwright to dump `innerHTML` / take screenshots at each step (no
`codegen` recording was kept, but the same manual steps codegen would
produce were used).

## Key architectural facts

- **The editor is iframe-based, the player is not.** `h5peditor-editor.js`
  replaces the outer page's `.h5p-editor` div with an
  `iframe.h5p-editor-iframe`; every editor widget selector must go through
  `page.frameLocator('.h5p-editor-iframe')`. The player, by contrast, renders
  `.h5p-content` directly into the top-level document when loaded as a full
  page navigation (`GET /h5p/play/:contentId`) - H5P core only creates a
  nested `iframe.h5p-iframe` when content is _embedded_ into a third-party
  page via `h5p-embed.js`, which is not how our player route works.
- **The save button is outside the iframe.** `#save-h5p` is part of the
  outer page's `<form id="h5p-content-form">` (see
  `packages/h5p-server/src/renderers/default.ts`), not inside
  `.h5p-editor-iframe`.
- **Rich text fields are `contenteditable` divs, not CKEditor iframes.** This
  editor build inlines CKEditor into a `.ckeditor` `contenteditable` element
  rather than nesting another iframe. Playwright's `.fill()` works on them
  directly. Do **not** `.click()` them first - clicking reveals an
  "important description" helper overlay that can make the element fail
  Playwright's actionability check on the following `.fill()` call.
- **Field selectors use `field-name-<semantics field name>`, not IDs.** Every
  field gets a `field-<name>-<sequence number>` id (e.g. `field-text-16`)
  where the numeric suffix is a global counter and not stable between runs.
  Always select on the semantics-derived class instead
  (`.field-name-text`, `.field-name-title`, ...), which is stable as long as
  the content type's `semantics.json` field names don't change.
- **Two elements can share an accessible name.** E.g. there are two
  "Metadata" buttons and two "Title" labels on the editor form at once (one
  collapsed summary on the main form, one inside the metadata popup). Scope
  queries to `.h5p-metadata-popup-overlay` once it is open rather than using
  bare `getByLabel`/`getByRole` calls against the whole frame.

## StartPage (`/`)

Outer document only, no iframe. Source: `startPageRenderer.ts`.

| Selector                                                               | Notes                                                      |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `getByRole('heading', { name: 'H5P NodeJs Demo' })`                    | Page title                                                 |
| `getByRole('link', { name: 'Create new content' })`                    | Links to `/h5p/new`                                        |
| `.list-group-item` filtered by `getByRole('heading', { name: title })` | One row per content object; the title is an `<h5>`         |
| Row `.getByRole('link', { name: 'edit' })`                             | -> `/h5p/edit/:id`                                         |
| Row `.getByRole('link', { name: 'download' })`                         | -> `/h5p/download/:id`, triggers a file download           |
| Row `.getByRole('link', { name: 'download HTML' })`                    | -> `/h5p/html/:id`, triggers a file download               |
| Row `.getByRole('link', { name: 'delete' })`                           | -> `/h5p/delete/:id`, no confirmation dialog on this route |
| `#library-admin-container`                                             | React root for `LibraryAdminPanel`                         |
| `#content-type-cache-container`                                        | React root for `ContentTypeCachePanel`                     |

## EditorPage (`/h5p/new`, `/h5p/edit/:contentId`)

Outer document has `#h5p-content-form` and `#save-h5p`. Everything else is
inside `iframe.h5p-editor-iframe`.

### Content type selection (H5P Hub tile list, inside the iframe)

Each installed or installable content type is a `<li role="button"
class="h5p-hub-media">` with an `id` like `#h5p-blanks` (lowercased machine
name, no `H5P.` prefix or dots) and an `<div class="h4
h5p-hub-media-heading">` containing the display title. Already-installed
types show a "Details" button; not-yet-installed types show a "Get" button
(`.h5p-hub-button-install`) - clicking either the tile or its button selects
that type for the form. Page object: `EditorPage.chooseContentType(label)`
filters tiles by visible text rather than relying on the generated id, since
the id is derived from the machine name and would need a lookup table.

### Main content form (inside the iframe, content-type-specific)

For H5P.Blanks specifically:

| Selector                                | Notes                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.field-name-text .ckeditor`            | Task description (rich text, `contenteditable`)                                                                                                         |
| `.field.list.importance-high .ckeditor` | First "Text blocks" list item (the blank question); with only one item present this is unambiguous. Adding more items requires disambiguating by index. |
| `.h5peditor-form-manager-title`         | Breadcrumb title shown while the form manager wizard is active                                                                                          |

### Metadata popup (inside the iframe)

Opened via `getByRole('button', { name: 'Metadata' }).first()` (the first
match is the one on the main form's collapsed summary; both open the same
popup). Wait for `.h5p-metadata-popup-overlay` to become visible before
interacting - it renders instantly but Playwright's actionability check can
still race the CSS transition.

| Selector (scoped to `.h5p-metadata-popup-overlay`)       | Notes                                                                                                                                                                                                                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.field-name-title input`                                | Title text input                                                                                                                                                                                                            |
| `.field-name-license select`                             | License `<select>`                                                                                                                                                                                                          |
| `.field-name-licenseVersion select`                      | License version `<select>`, disabled until a versioned license is chosen                                                                                                                                                    |
| `.field-name-yearFrom input`, `.field-name-yearTo input` | Year range                                                                                                                                                                                                                  |
| `.field-name-source input`                               | Source URL                                                                                                                                                                                                                  |
| `.h5p-metadata-button.h5p-save`                          | "Save metadata" button; closes the popup                                                                                                                                                                                    |
| (author list) `.field-name-authorList`                   | Not yet wrapped in a page object method - list widget for adding authors, has its own "Author's name" input and "Save author" button per entry. Add a method when a session needs it (likely session 5, metadata coverage). |

### Import via `.h5p` upload (inside the iframe)

`input[type="file"][accept=".h5p"]` (no id, `aria-hidden="true"`) is the
"Paste"-adjacent import control on the Hub's upload tab
(`#h5p-hub-tab-panel-h5p-hub-upload`). Not yet wrapped in a page object
method - needed for the round-trip spec in session 6.

### Save (outer document)

`#save-h5p` - clicking it triggers an async AJAX POST to the current URL;
on success the outer page navigates to `/h5p/play/:contentId`.
`EditorPage.save()` clicks it and waits for that navigation, returning the
parsed content id.

## PlayerPage (`/h5p/play/:contentId`)

No iframe (see architectural note above).

| Selector                                 | Notes                                                           |
| ---------------------------------------- | --------------------------------------------------------------- |
| `.h5p-content`                           | Content root, has `data-content-id`                             |
| `getByRole('button', { name: 'Reuse' })` | Always present (`.h5p-export` button in the `.h5p-actions` bar) |
| link to `http://h5p.org`                 | Always present, `.h5p-link` in the action bar                   |

Copyright/Embed/Download buttons in the action bar are conditional:

- Download only appears when the content's `exportUrl` is set in
  `H5PIntegration.contents[id]` (true by default via
  `showDownloadButton: true` in `expressRoutes.ts`, but depends on the
  content actually having export enabled).
- Embed only appears when `embedCode`/`resizeCode` are present on the
  content (added by the `#4613` player-model change; empty for content
  created through the plain editor flow used in this session's spec).
- Copyright/"Rights of use" visibility was not conclusively verified in this
  session - revisit when session 5 needs it.

## LibraryAdminPanel (`#library-admin-container` on `/`)

React component, source `LibraryAdminComponent.tsx`. No iframe.

| Selector                                        | Notes                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `#file2`                                        | Hidden `<input type="file">` for uploading a `.h5p` library package; use `setInputFiles()` directly, no need to click the visible label first |
| `tbody tr` filtered by title text               | One row per installed library, title text like `Fill in the Blanks (1.14.13)`                                                                 |
| Row `.getByRole('button', { name: 'details' })` | Expands `LibraryDetailsComponent` inline                                                                                                      |
| Row `.getByRole('button', { name: 'delete' })`  | Only present when `canBeDeleted` is true (no dependents)                                                                                      |

## ContentTypeCachePanel (`#content-type-cache-container` on `/`)

React component, source `ContentTypeCacheComponent.tsx`. No iframe.

| Selector                                      | Notes                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `getByRole('button', { name: 'Update now' })` | Triggers a manual Hub cache refresh (network call to h5p.org - tag any spec using this `@network`) |
| `getByText('Last update:')`                   | Shows the last cache update timestamp, or "never"                                                  |

**Plan correction:** `E2E_AUTOMATION_PLAN.md` session 4 assumed this panel
has a button to download the cache file as JSON. It does not - the component
only has the last-update text and the "Update now" button. There is no
UI-driven download of the content type cache; the equivalent data is only
reachable through `test/data/content-type-cache/*.json` fixtures. Session 4
must be adjusted to drop that sub-task (or re-target it at a REST endpoint
call instead of a UI download) when it is implemented.

## Session 5 additions: content lifecycle (Blanks + Course Presentation)

Discovered by driving a real Chromium instance against a manually started
`npm start` with both content types installed, dumping `innerHTML` at each
step (same approach as session 2 - see its "Discovery method" note).

### Author widget (metadata popup)

`.field-name-authorList` (mentioned as a TODO in the session-2 notes above)
does not exist; the author list is a bespoke widget,
`.h5p-metadata-author-widget`, not a generic H5P "list" field:

| Selector (scoped to `.h5p-metadata-author-widget`) | Notes                                                            |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `.field-name-name input`                           | Author's name                                                    |
| `.field-name-role select`                          | Author's role, defaults to "Author"                              |
| `.h5p-save-author`                                 | Adds the entry to the list below (`.h5p-author-list-wrapper ul`) |

### Library type selects (e.g. Blanks' "Media" `type` field)

`EditorPage.selectLibraryType(groupSelector, label)` uses
`${groupSelector} > .content > .field.library > select` - every combinator
here is a **direct-child** (`>`), not a descendant. Once a type like Image
is chosen, that type's own widget renders its _own_ nested
`.field.library` structure further down (e.g. the image's copyright dialog
has License/License Version `<select>`s inside another `.field.library`
several levels deep), so a bare descendant selector like
`${groupSelector} select` or even `${groupSelector} > .content > .field.library select`
(only the last step relaxed to a descendant combinator) matches those too
and throws a Playwright strict-mode violation. Only the fully direct-child
chain isolates the single top-level type select.

**Watch out - the `type` select can be legitimately hidden.** When a
`library` field's `options` list has exactly one real choice once
uninstalled libraries are excluded (e.g. Blanks' `media.type` offers
Image/Video/Audio, but content-lifecycle.spec.ts only seeds H5P.Blanks,
whose own dependency tree includes H5P.Image but not H5P.Video/H5P.Audio),
the H5P media widget auto-selects that one option and sets both
`.h5p-editor-flex-wrapper` (the label) and the `<select>` itself to
`display: none`, since there is nothing meaningful left to pick - it goes
straight to rendering the chosen type's own widget instead. Calling
`selectLibraryType()` in that situation hangs until timeout waiting for a
select that is hidden _by design_, not by a bug; check how many real
options a seeded environment actually has before assuming this step is
needed (content-lifecycle.spec.ts's Blanks fixture skips it entirely).

### Collapsed groups (e.g. Blanks' "Media" field)

A `group` field with `importance: medium` or lower renders as a
`<fieldset class="field ... field-name-<x>">` that starts collapsed. Its
`> .title` div (`role="button"`, not a real `<button>`) toggles an
`expanded` class on the fieldset. Must be clicked before any field inside it
(e.g. the `type` library selector) is interactable -
`EditorPage.expandGroup('.field-name-media')`.

### Image upload (`image` widget field), used by both content types

Both Blanks' `media.type` "Image" option and Course Presentation's "Image"
dragnbar element render the exact same `field-name-file` structure:

1. `.field-name-file .file a.add` ("Add" link) - clicking it lazily creates
   the actual file input elsewhere in the DOM (not nested under
   `.field-name-file`); nothing to click is present before this.
2. `input[type="file"][accept*="image"]` (created by step 1) -
   `setInputFiles()` directly, no dialog to drive.
3. `.field-name-alt input` - required "Alternative text"; the field only
   appears (via a `showWhen` rule keyed on `decorative`) once an image is
   present.

Only one `.field-name-file` is ever visible at a time in either flow, so
none of this needs extra scoping. `EditorPage.uploadImage(path, altText)`
wraps all three steps.

### Course Presentation slide elements (DragNBar toolbar)

Clicking a toolbar button (`.h5p-dragnbar-a.h5p-dragnbar-<type>-button`,
e.g. `advancedtext`, `image`, `truefalse`, `multichoice`, `blanks`,
`gotoslide`; less common ones are nested one level deeper under
`.h5p-dragnbar-more-button`) does not drop a default element silently - it
immediately opens that subcontent's own form as a full-screen "form
manager" wizard (breadcrumbed "Course Presentation > <Type>", with
Delete/Done buttons top right, mirroring the same wizard subcontent
editing uses elsewhere in H5P). Fill the revealed fields (same
`field-name-*` conventions as any other content type's semantics), then
call `EditorPage.finishElementForm()` (clicks "Done") to return to the
slide canvas with the element placed.

To edit an **already-placed** element: click it (by its visible text) to
select it, which reveals a floating context menu
(`.h5p-dragnbar-context-menu`) with icon buttons
`.h5p-dragnbar-context-menu-button.<action>` (`transform`, `edit`, `copy`,
`bringtofront`, `sendtoback`, `remove`), each also exposing an accessible
name (e.g. `aria-label="Edit"`). `EditorPage.editSlideElement(text)` clicks
the element then `getByRole('button', { name: 'Edit', exact: true })` to
reopen its form.

**Watch out:** `getByRole` name matching is substring-based by default (not
exact) - `{ name: 'Edit' }` without `exact: true` would also match an "Edit
image" button if one happens to be in the DOM at the same time (it normally
isn't, since only one subcontent form is visible at once, but always pass
`exact: true` for short, common words like this). The same bug existed in
`StartPage.downloadLink()` (matched both "download" and "download HTML")
and has been fixed the same way.

**Watch out - freshly added elements fully overlap.** Every element added
via the dragnbar toolbar defaults to the exact same position/size
(`left: 30%; top: 30%; width: 40%; height: 40%`) until manually
repositioned. On a slide with more than one element, their
`.h5p-element-overlay`s (the actual click targets - see below) stack
directly on top of each other, and the browser's own hit-testing always
resolves a click to the topmost one in DOM/elements-array order, regardless
of which element Playwright's locator matched (`{ force: true }` does not
change this - it skips Playwright's own actionability _check_, but the
click is still a real, coordinate-based OS-level event that the browser
routes by z-order). `EditorPage.editSlideElement()` can therefore only
reliably select the _last_-added element on such a slide;
content-lifecycle.spec.ts's Course Presentation fixture edits "This slide
has extra subcontent." (added last) rather than "Welcome to the course."
(added first) for exactly this reason. Editing an earlier element would
first require repositioning whatever is on top of it via the "Transform"
panel (`.h5p-dragnbar-context-menu-button.transform`, revealing
`.h5p-dragnbar-x`/`.h5p-dragnbar-y` position inputs) - no spec needs that
yet.

### Whole-content copy/paste (top of the outer form, both content types)

Distinct from the per-field copy/paste-wrap some `library` fields render
(e.g. Blanks' `media.type`, which stays `disabled` until that field has a
value) - both sets of buttons share the same classes
(`.h5peditor-copy-button` / `.h5peditor-paste-button`), so they must be
disambiguated:

- Copy: `.h5peditor-copy-button:not(.disabled)` - the whole-content one is
  enabled as soon as the form has a title; a field-level one stays disabled
  until that specific field is filled in, so `:not(.disabled)` picks the
  right one as long as no field-level copy button has been enabled yet.
- Paste & Replace: disambiguated by its title attribute,
  `[title="Replace existing content with H5P Content from the clipboard"]`
  (the Hub's _own_ upload-tab paste button, `#h5peditor-hub-paste-button`,
  and any field-level paste button use different title text). Only becomes
  visible/enabled after `Copy` has been used earlier in the same browser
  (the H5P clipboard is `localStorage`-backed, not server-side).
- Clicking Paste & Replace opens a confirmation dialog
  (`.h5p-confirmation-dialog-background`) titled "Replace Content" -
  `getByRole('button', { name: 'Replace content' })` confirms it. Forgetting
  this dialog is the most likely way this flow silently hangs/times out.
- The H5P editor also has an unrelated **autosave/draft-restore** feature
  that persists unsaved form state in `localStorage` across "new content"
  page loads within the same browser context. A round-trip test asserting
  on copy/paste must not reuse a field value that could plausibly also
  survive via autosave (e.g. plain body text) - assert on the **Title**
  metadata field instead, which is not autosaved the same way, and is
  therefore an unambiguous signal that the value came from the clipboard
  paste and not from a leftover draft.

### `.h5p` package upload via the Hub's "Upload" tab (round-trip re-import)

1. `frame.getByText('Upload', { exact: true })` - switches the Hub's
   content-type-picker header from "Create Content" to its "Upload" tab
   (`role="tab"`-like radio buttons, not real tabs).
2. `.h5p-hub-input-wrapper input[type="file"]` - distinct from the outer
   page's unrelated `input[type="file"][accept=".h5p"]` hub-level import
   input mentioned in session 2's notes below (that one lives in a
   different, apparently unused, `.h5p-hub-upload-wrapper` markup branch -
   always scope to `.h5p-hub-input-wrapper` for the real one).
3. `getByRole('button', { name: 'Use' })` - confirms the picked file, parses
   it, and swaps in the package's content type's editor form pre-filled
   from its `content.json`. Wait for that content type's own
   `waitSelector` (e.g. `.field-name-text .ckeditor` for Blanks) before
   interacting further.

### Deleting content: response code, not 404

`packages/h5p-examples/src/expressRoutes.ts`'s play route
(`GET /h5p/play/:contentId`) has no not-found branch of its own - it always
calls `h5pPlayer.render()` and its single `catch` maps _any_ rejection
(including "content does not exist") to `res.status(500)`. A round-trip or
lifecycle test that checks "content is gone from storage" via this route
must assert **HTTP 500**, not 404, after deletion.
`packages/h5p-examples/src/expressRoutes.ts`'s delete route
(`GET /h5p/delete/:contentId`) also does not redirect back to `/` - it
renders a small standalone "Content successfully deleted." page with a
JS-driven "Go Back" link; navigate back to `/` explicitly afterwards to
check the start page list.
