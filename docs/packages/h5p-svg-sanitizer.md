# SVG sanitizer package

## Background

SVGs can contain malicious JavaScript code as, for instance, explained in [this
article](https://vnbrs.medium.com/a-lesser-known-vector-for-xss-attacks-svg-files-d700345fff1d).
That's why this library doesn't allow uploading SVG files as part of the content
of H5P packages or media files (IH5PConfig.contentWhitelist doesn't contain the
svg extension by default). SVG uploads as parts of libraries files, e.g. icons
are still allowed, as these can only be uploaded by privileged users who can
upload executable JavaScript files anyway, so uploading SVG files with injected
scripts doesn't open a new attack vector.

If you want to allow SVG files in content and still be protected against XSS
attacks, you can use this SVG sanitizer package. The sanitizer relies on the
[dompurify package](https://www.npmjs.com/package/dompurify) to do the actual
sanitization.

## Usage

1. Install the `@lumieducation/h5p-svg-sanitizer` package in your application.
2. Add the sanitizer to the H5P editor object options and add the `svg`
   extension to the `contentWhitelist` property of the H5P configuration:

```ts
   const h5pEditor = new H5PEditor(
        cache,
        {
            ...
            // We've added svg to the whitelist!
            contentWhitelist: 'svg json png jpg jpeg gif bmp tif tiff eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile vtt webvtt gltf glb',
            ...
        },
        libraryStorage,
        contentStorage,
        temporaryStorage,
        translationCallback,
        urlGenerator,
        {
            // Add the sanitizer
           fileSanitizers: [new SvgSanitizer()]
        });
```

Now there is protection against XSS in SVGs in these cases:

- Uploading individual SVG media files (via `H5PEditor.saveContentFile`)
- Uploading H5P packages with SVG files in the `content` directory from the GUI
  (stores media files in temporary storage)
  (via `ContentStorage.copyFromDirectoryToTemporary` or `H5PEditor.uploadPackage`)
- Uploading H5P Packages with SVG files in the `content` directory and directly
  storing them in the content (via `ContentStorage.saveContentFile`)

## Example

The examples in `packages/h5p-examples` and `packages/h5p-rest-example-server`
already use the SVG sanitizer.

**Note:** File sanitization only works of you pass uploaded content files to
`H5PEditor.saveContentFile` as temporary files, not as in-memory streams. That's
why we temporary file uploads are enable by default in the example. This can be
disabled by setting the environment variable `TEMP_UPLOADS` to `false`. The
environment variable `TEMP_UPLOADS` is part of the example code and won't work
in your custom implementation, if you don't add explicit support for it.

## Caveats

The SVG sanitizer mutates the uploaded SVG content files, so they are not
identical to the ones originally uploaded. For example the order of element
attributes might be different from the one in the original file. There is also
no guarantee that it only removes actually malicious code and not other parts of
the SVG that are not really harmful. In most use cases this should not be a
problem, but if licensing of a certain SVG file forbids changing its code or if
there are parts of files that are removed and users need them, the sanitizer
package might not be right for you.

## Testing whether SVGs are correctly sanitized

Get the [`SVG XSS injection demo
file`](/packages/h5p-svg-sanitizer/test/xss-svg.h5p) from the repo, upload it to
your system and save. You should see a simple H5P Blanks activity with the image
of a gray circle. Copy the URL of the image, paste it into your browser's
address bar and load it. You should now _NOT_ see a popup message which is
caused by executing JavaScript code in the SVG. If you see the message,
something is misconfigured.
