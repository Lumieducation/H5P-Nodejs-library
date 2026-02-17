# @lumieducation/h5p-html-exporter

The H5P HTML exporter is a component meant to be used in a server running
[@lumieducation/h5p-server](https://www.npmjs.com/package/@lumieducation/h5p-server).
It creates self-contained and minified HTML bundles that can be used to
distribute H5P content without a H5P compatible online system.

## Library file patches

Some H5P library files contain code that is incompatible with the export
process (e.g. syntax that breaks the JavaScript minifier) or causes runtime
issues in the exported HTML bundle. The exporter ships with built-in patches
for known issues and allows you to provide your own custom patches.

### How patches work

Patches are simple text replacements (string or regex) applied to library file
content **before** minification and PostCSS processing. Each patch targets a
specific library by machine name, an optional version range, and a filename
within the library.

Both JavaScript and CSS files can be patched.

### Built-in patches

The following patches are included and applied automatically:

| Library       | File         | Description                                                                                                                   |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `H5P.Echo360` | `echo360.js` | Replaces `delete previousTickMS` with `previousTickMS = undefined` to prevent uglifyJs from throwing an error in strict mode. |

### Adding custom patches

Pass an array of `ILibraryFilePatch` objects as the last parameter of the
`HtmlExporter` constructor:

```typescript
import HtmlExporter, {
    ILibraryFilePatch
} from '@lumieducation/h5p-html-exporter';

const customPatches: ILibraryFilePatch[] = [
    {
        machineName: 'H5P.SomeLibrary',
        filename: 'scripts/main.js',
        search: 'brokenFunction()',
        replace: 'fixedFunction()',
        patchReason: 'Fix broken function call that crashes the export'
    }
];

const exporter = new HtmlExporter(
    libraryStorage,
    contentStorage,
    config,
    coreFilePath,
    editorFilePath,
    undefined, // template
    undefined, // translationFunction
    customPatches
);
```

### Patch options

| Property      | Type                             | Required | Description                                                                                                       |
| ------------- | -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `machineName` | `string`                         | Yes      | The H5P library machine name (e.g. `"H5P.Echo360"`).                                                              |
| `filename`    | `string`                         | Yes      | Filename to match. Uses `endsWith` matching, so `"echo360.js"` matches both `"echo360.js"` and `"js/echo360.js"`. |
| `search`      | `string \| RegExp`               | No\*     | The pattern to find. Literal strings are matched exactly. RegExp supports flags and capture groups.               |
| `replace`     | `string`                         | No\*     | The replacement text. Supports `$1`, `$2`, etc. for regex capture groups.                                         |
| `minVersion`  | `{ majorVersion, minorVersion }` | No       | Minimum library version (inclusive). If omitted, no lower bound.                                                  |
| `maxVersion`  | `{ majorVersion, minorVersion }` | No       | Maximum library version (inclusive). If omitted, no upper bound (applies to all future versions).                 |
| `replaceAll`  | `boolean`                        | No       | Replace all occurrences instead of just the first. Default: `false`.                                              |
| `disabled`    | `boolean`                        | No       | If `true`, the patch is not applied. Useful for disabling built-in patches.                                       |
| `patchReason` | `string`                         | No       | Human-readable explanation of why the patch exists.                                                               |

\* `search` and `replace` are required unless `disabled` is `true`.

### Version ranges

H5P libraries use a two-part versioning scheme (major.minor). Version range
matching is intentionally permissive: if you omit `maxVersion`, the patch
applies to all future versions of the library. This is the recommended default,
since you typically cannot predict when a library author will fix the issue you
are patching around.

```typescript
// Applies to H5P.Example versions 1.2 through 3.5 (inclusive)
{
    machineName: 'H5P.Example',
    filename: 'example.js',
    minVersion: { majorVersion: 1, minorVersion: 2 },
    maxVersion: { majorVersion: 3, minorVersion: 5 },
    search: 'old',
    replace: 'new'
}

// Applies to all versions (recommended when unsure)
{
    machineName: 'H5P.Example',
    filename: 'example.js',
    search: 'old',
    replace: 'new'
}
```

### Overriding built-in patches

A custom patch with the same `machineName` and `filename` as a built-in patch
**replaces** that built-in patch. All other built-in patches remain active.

```typescript
// Replace the built-in echo360 patch with a custom one
const customPatches: ILibraryFilePatch[] = [
    {
        machineName: 'H5P.Echo360',
        filename: 'echo360.js',
        search: 'delete previousTickMS',
        replace: '/* custom fix applied */',
        patchReason: 'Custom handling of the echo360 strict mode issue'
    }
];
```

### Disabling built-in patches

To disable a built-in patch without adding a replacement, provide a custom
patch with the same `machineName` and `filename` and set `disabled: true`:

```typescript
const customPatches: ILibraryFilePatch[] = [
    {
        machineName: 'H5P.Echo360',
        filename: 'echo360.js',
        disabled: true
    }
];
```

## Support

This work obtained financial support for development from the German
BMBF-sponsored research project "CARO - Care Reflection Online" (FKN:
01PD15012).

Read more about them at the following websites:

- CARO - [https://blogs.uni-bremen.de/caroprojekt/](https://blogs.uni-bremen.de/caroprojekt/)
- University of Bremen - [https://www.uni-bremen.de/en.html](https://www.uni-bremen.de/en.html)
- BMBF - [https://www.bmbf.de/en/index.html](https://www.bmbf.de/en/index.html)
