# AGENTS.md

## What This Is

TypeScript/Node.js monorepo (npm workspaces + Lerna). Community re-implementation
of the H5P server — a framework for interactive HTML5 content. This is a library,
not a standalone app.

## How H5P Works

**H5P content** is an interactive learning object (quiz, presentation, interactive
video, etc.). Each piece of content consists of:

- **`h5p.json`** — metadata declaring the main library (content type), all
  dependency libraries, and license/copyright info.
- **`content.json`** — the author's data (questions, answers, text, config). Its
  schema is defined by the content type's `semantics.json`. The server never
  interprets this; it is produced by the editor and consumed by the player, both
  in the browser.
- **Content files** — images, videos, audio uploaded by the author.

**Libraries** are reusable components: JS, CSS, language files, and a
`library.json` manifest. A library with `runnable: true` is a **content type**
(what users pick when creating content, e.g., "Multiple Choice"). Non-runnable
libraries are shared utilities. Libraries depend on other libraries through
`preloadedDependencies`, `editorDependencies`, and `dynamicDependencies`.

**Server vs. browser split:** The server (this library) manages storage,
validates packages, resolves dependency trees, and generates an HTML page with a
`window.H5PIntegration` JSON blob containing the content parameters, the full
list of JS/CSS URLs to load, and config. The **H5P core JS** (separate download
from `h5p-php-library` / `h5p-editor-php-library` repos — browser-side code
originally from the PHP ecosystem) then takes over: it reads the integration
object, loads the scripts, instantiates the content type, and renders everything
client-side.

**The .h5p package** is a self-contained zip: `h5p.json` + `content/` directory

- one directory per library dependency. This is the interchange format between
  any H5P-compatible systems. `PackageImporter` / `PackageExporter` handle this.

**H5P Hub** (`ContentTypeCache`, `ContentTypeInformationRepository`) is a
registry at h5p.org listing available content types. The editor UI queries it to
show what can be installed/updated. `ContentHub` is a separate service for
searching and downloading pre-made content.

**Temporary files:** When a user uploads media in the editor before saving, files
go to `ITemporaryFileStorage` (marked with `#tmp`). On save, `ContentStorer`
moves them to permanent `IContentStorage` and cleans up.

## Packages (`packages/`)

```
h5p-server              Core: content/library management, validation, rendering
├── h5p-express         Express routers/middleware
├── h5p-html-exporter   Export content as self-contained HTML
├── h5p-mongos3         MongoDB + S3 storage implementations
├── h5p-redis-lock      Redis distributed lock
├── h5p-svg-sanitizer   SVG XSS sanitization
├── h5p-clamav-scanner  ClamAV antivirus integration
├── h5p-shared-state-server  ShareDB real-time shared state
└── h5p-webcomponents   Browser Web Components for editor/player
    └── h5p-react       React wrappers
```

Example apps (private, not published): `h5p-examples`, `h5p-rest-example-server`,
`h5p-rest-example-client`.

## Build, Test, Lint

```bash
npm run build                 # All packages in dependency order
npm run build:h5p-server      # Single package (replace name as needed)
npm test                      # Unit tests (h5p-server, h5p-express, etc.)
npm run test:h5p-mongos3      # Needs Docker: npm run start:dbs first
npm run test:integration      # Integration tests
npm run lint                  # ESLint + remark
npm run format:check          # Prettier check
npm run format                # Prettier fix
```

Build `h5p-server` first — everything else depends on it.

**Running tests for a single file:** The root `vitest.config.ts` configures
Vitest. Always run vitest from the **repo root**:

```bash
npx vitest run contentFileValidation         # Match test files by name
npx vitest run packages/h5p-server/test/Foo  # Match by path prefix
```

Individual packages have their own `vitest.config.ts` for CI, but running
from the root with a file name filter is the simplest approach.

## Code Style

- **4-space indentation**, single quotes, no trailing commas, LF line endings
- `no-param-reassign`: **error** — never reassign function parameters
- `no-console`: **warn**
- `any` is allowed but discouraged
- Unused params: prefix with `_` (e.g., `_actingUser`)
- JSDoc on all public methods and classes
- Major classes use `export default`
- Member ordering: constructors first, then static, then instance; public before private

## Naming Conventions

- **Classes/Enums/Types:** PascalCase (`H5PEditor`, `ContentPermission`)
- **Interfaces:** `I`-prefixed (`IContentStorage`, `IUser`)
- **Files:** PascalCase matching class name (`H5PEditor.ts`)
- **Tests:** `ClassName.test.ts` or `ClassName.feature.test.ts`

## Architecture

Interface-based abstraction with constructor injection. `h5p-server` defines
storage/service interfaces; implementations are injected into `H5PEditor`:

- `IContentStorage` / `ILibraryStorage` / `ITemporaryFileStorage` — persistence
- `IContentUserDataStorage` — user state
- `IPermissionSystem` — authorization
- `ILockProvider` — distributed locking
- `IFileSanitizer` / `IFileMalwareScanner` — security plugins

Always program to the interface. Default filesystem implementations live in
`packages/h5p-server/src/implementation/`.

## Key File Locations

Where to look for common tasks (all paths relative to `packages/`):

**h5p-server (core logic):**

- Content CRUD & saving: `h5p-server/src/H5PEditor.ts`, `h5p-server/src/ContentStorer.ts`, `h5p-server/src/ContentManager.ts`
- Library management: `h5p-server/src/LibraryManager.ts`
- Package import/export: `h5p-server/src/PackageImporter.ts`, `h5p-server/src/PackageExporter.ts`
- Content type hub: `h5p-server/src/ContentTypeCache.ts`, `h5p-server/src/ContentTypeInformationRepository.ts`
- Player rendering: `h5p-server/src/H5PPlayer.ts`
- All interfaces & types: `h5p-server/src/types.ts`
- Default filesystem storage: `h5p-server/src/implementation/fs/`
- Configuration: `h5p-server/src/implementation/H5PConfig.ts`
- Translations: `h5p-server/assets/translations/`

**h5p-express (HTTP layer):**

- Express route handlers: `h5p-express/src/`

**Other packages** are small and self-contained; start from their `src/index.ts`.

**Dependency management:**

- Root `package.json` for workspace config and shared devDependencies
- Each `packages/*/package.json` for per-package dependencies
- Use `npm ls <pkg>` and `npm outdated` to inspect resolved versions (do not
  read `package-lock.json` directly)

## Git Hooks & Commits

Husky runs on every commit/push — code must pass before committing:

- **pre-commit:** `npm run lint` + `npm run format:check`
- **commit-msg:** commitlint (conventional commits)
- **pre-push:** `npm run test`

Commit format: `type(scope): description`
Types: `feat`, `fix`, `chore`, `test`, `refactor`, `docs`, `style`, `perf`
Example: `feat(h5p-server): add content user data context`
