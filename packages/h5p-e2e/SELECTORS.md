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
  nested `iframe.h5p-iframe` when content is *embedded* into a third-party
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

| Selector | Notes |
| --- | --- |
| `getByRole('heading', { name: 'H5P NodeJs Demo' })` | Page title |
| `getByRole('link', { name: 'Create new content' })` | Links to `/h5p/new` |
| `.list-group-item` filtered by `getByRole('heading', { name: title })` | One row per content object; the title is an `<h5>` |
| Row `.getByRole('link', { name: 'edit' })` | -> `/h5p/edit/:id` |
| Row `.getByRole('link', { name: 'download' })` | -> `/h5p/download/:id`, triggers a file download |
| Row `.getByRole('link', { name: 'download HTML' })` | -> `/h5p/html/:id`, triggers a file download |
| Row `.getByRole('link', { name: 'delete' })` | -> `/h5p/delete/:id`, no confirmation dialog on this route |
| `#library-admin-container` | React root for `LibraryAdminPanel` |
| `#content-type-cache-container` | React root for `ContentTypeCachePanel` |

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

| Selector | Notes |
| --- | --- |
| `.field-name-text .ckeditor` | Task description (rich text, `contenteditable`) |
| `.field.list.importance-high .ckeditor` | First "Text blocks" list item (the blank question); with only one item present this is unambiguous. Adding more items requires disambiguating by index. |
| `.h5peditor-form-manager-title` | Breadcrumb title shown while the form manager wizard is active |

### Metadata popup (inside the iframe)

Opened via `getByRole('button', { name: 'Metadata' }).first()` (the first
match is the one on the main form's collapsed summary; both open the same
popup). Wait for `.h5p-metadata-popup-overlay` to become visible before
interacting - it renders instantly but Playwright's actionability check can
still race the CSS transition.

| Selector (scoped to `.h5p-metadata-popup-overlay`) | Notes |
| --- | --- |
| `.field-name-title input` | Title text input |
| `.field-name-license select` | License `<select>` |
| `.field-name-licenseVersion select` | License version `<select>`, disabled until a versioned license is chosen |
| `.field-name-yearFrom input`, `.field-name-yearTo input` | Year range |
| `.field-name-source input` | Source URL |
| `.h5p-metadata-button.h5p-save` | "Save metadata" button; closes the popup |
| (author list) `.field-name-authorList` | Not yet wrapped in a page object method - list widget for adding authors, has its own "Author's name" input and "Save author" button per entry. Add a method when a session needs it (likely session 5, metadata coverage). |

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

| Selector | Notes |
| --- | --- |
| `.h5p-content` | Content root, has `data-content-id` |
| `getByRole('button', { name: 'Reuse' })` | Always present (`.h5p-export` button in the `.h5p-actions` bar) |
| link to `http://h5p.org` | Always present, `.h5p-link` in the action bar |

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

| Selector | Notes |
| --- | --- |
| `#file2` | Hidden `<input type="file">` for uploading a `.h5p` library package; use `setInputFiles()` directly, no need to click the visible label first |
| `tbody tr` filtered by title text | One row per installed library, title text like `Fill in the Blanks (1.14.13)` |
| Row `.getByRole('button', { name: 'details' })` | Expands `LibraryDetailsComponent` inline |
| Row `.getByRole('button', { name: 'delete' })` | Only present when `canBeDeleted` is true (no dependents) |

## ContentTypeCachePanel (`#content-type-cache-container` on `/`)

React component, source `ContentTypeCacheComponent.tsx`. No iframe.

| Selector | Notes |
| --- | --- |
| `getByRole('button', { name: 'Update now' })` | Triggers a manual Hub cache refresh (network call to h5p.org - tag any spec using this `@network`) |
| `getByText('Last update:')` | Shows the last cache update timestamp, or "never" |

**Plan correction:** `E2E_AUTOMATION_PLAN.md` session 4 assumed this panel
has a button to download the cache file as JSON. It does not - the component
only has the last-update text and the "Update now" button. There is no
UI-driven download of the content type cache; the equivalent data is only
reachable through `test/data/content-type-cache/*.json` fixtures. Session 4
must be adjusted to drop that sub-task (or re-target it at a REST endpoint
call instead of a UI download) when it is implemented.
