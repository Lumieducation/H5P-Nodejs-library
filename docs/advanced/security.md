# Security

## Restricting library installation

The concept of H5P that H5P packages don't just include the author's content,
but all the required libraries that are needed to display the content creates
some inherent risks. As the libraries in a H5P package include JavaScript, CSS
and SVG files, which are run in the user's browser, H5P basically deliberately
allows Cross-Site-Scripting to some users.

You must make sure that only trustworthy administrators can install and update
H5P content types and libraries by setting up a restrictive [permission
system](./authorization.md)!

In addition, you must make sure that all H5P packages that are uploaded by
administrators only contain safe and trustworthy H5P libraries! Never upload H5P
packages that you got from third-party sites (without thoroughly checking their
contents). It's best to get them directly from the H5P Hub - or if your needed
content types aren't available there directly from the developer.

(Note that it can also mess up your H5P libraries, if user's upload forks of H5P
content types that use the same library names as the original content type. In
this case you can't update the original content type any more, as there are
already "newer" libraries (the fork) in your installation. This error is
difficult to track down. Most users don't know that H5P packages contain the
libraries and that they might inadvertently "infect" an installation by
uploading content packages. As an application developer and site administrator
you must make sure that this doesn't happen!)

## File sanitization

### What do file sanitizers do?

File sanitizers remove unsafe content from files that users upload into a H5P
system. A file sanitizer takes a temporary file in the file system of the app
server and changes its contents so that it's safe. For example, it can remove
inline JavaScript code from SVG files. It is normal behavior for a sanitizer to
alter an uploaded file, because it might, for instance, parse the file contents
into a tree, transform that tree and then re-serialize the data structure. In
comparison, malware scanners (see next section), only check for malicious
contents and don't alter files.

File sanitizers are used for these user uploads:

- uploaded individual (media) files inside the H5P editor (e.g. images) (calls
  to `H5PEditor.saveContentFile`)
- the contents (= media files in `content` directory) of uploaded H5P packages
  (calls to `ContentStorage.copyFromDirectoryToTemporary` or
  `H5PEditor.uploadPackage`)
- the contents (= media files in `content` directory) of H5P packages directly
  stored with `ContentStorage.saveContentFile` (deprecated method!)

Library files are not sanitized, as library files always contain JavaScript.
This means there's no need to filter them, as libraries are a potential security
risk by design. You must make sure to restrict library installation and only use
libraries from trusted sources to counter this risk!

### How to use file sanitizers

You can add file sanitizers to your H5P Editor setup, by initializing the H5P
Editor like this:

```ts
const h5pEditor = new H5PEditor(
    // ... regular configuration ...
    // Add the sanitizers to the options parameter
    {
        fileSanitizers: [ sanitizer1, sanitizer2 ]
    }
);
```

The sanitizers must implement this interface:

```ts
interface IFileSanitizer {
    /** The name of the scanner, e.g. SVG Sanitizer. Used in debug output */
    readonly name: string;

    /** Sanitizes files. The original file is expected to be replaced by the
     * sanitized file, so there is no new path to the sanitized file.*/
    sanitize(file: string): Promise<FileSanitizerResult>;
}

enum FileSanitizerResult {
    Sanitized,
    NotSanitized,
    Ignored
}
```

Note: Sanitization only works if you pass uploaded content files to
`H5PEditor.saveContentFile` as temporary files, not as in-memory streams!

### Existing file sanitizers

There's an SVG sanitizer that removes unsafe parts of SVGs in the
[`@lumieducation/h5p-svg-sanitizer`
package](/docs/packages/h5p-svg-sanitizer.md).

The examples in `packages/h5p-examples` and `packages/h5p-rest-example-server`
already use this sanitizer.

You can write you own implementations of the interface to sanitize other file
types.

### Using multiple sanitizers

It is possible to use more than one sanitizer. The sanitizers are called in
sequence, meaning that the sanitizers are called one after the other. The most
typical use case for this is to have sanitizers for different file types.

### Other uses of the interface

It is possible to use the sanitizer for other use cases, like reducing the
resolution of images to reduce their file size.

## Malware scanning

### What does malware scanning do?

Malware scanners check uploaded user files for malicious contents ("viruses",
scams etc.). They return a scan result and the H5P core library immediately
removes uploaded files from temporary storage and returns an error to the user
if the scan was not positive.

Malware scanners are used for these user uploads:

- uploaded individual (media) files inside the H5P editor (e.g. images) (calls
  to `H5PEditor.saveContentFile`)
- the contents (= media files in `content` directory) of uploaded H5P packages
  (calls to `ContentStorage.copyFromDirectoryToTemporary` or
  `H5PEditor.uploadPackage`)
- the contents (= media files in `content` directory) of H5P packages directly
  stored with `ContentStorage.saveContentFile` (deprecated method!)

Library files are not scanned, as library files always contain JavaScript. This
means there's no need to filter them, as libraries are a potential security risk
by design. You must make sure to restrict library installation and only use
libraries from trusted sources to counter this risk!

### How to use malware scanners

You can add malware scanners to your H5P Editor setup, by initializing the H5P
Editor like this:

```ts
const h5pEditor = new H5PEditor(
    // ... regular configuration ...
    // Add the sanitizers to the options parameter
    {
        malwareScanners: [ scanner1, scanner2 ]
    }
);
```

The sanitizers must implement this interface:

```ts
interface IFileMalwareScanner {
    /** The name of the scanner, e.g. ClamAV */
    readonly name: string;

    /** Scans a file for malware and returns whether it contains malware. */
    scan(
        file: string
    ): Promise<{ result: MalwareScanResult; viruses?: string }>;
}

enum MalwareScanResult {
    MalwareFound,
    Clean,
    NotScanned
}
```

Note: Malware scanning only works if you pass uploaded content files to
`H5PEditor.saveContentFile` as temporary files, not as in-memory streams!

### Existing malware scanners

There's a example scanner using ClamAV in the
[`@lumieducation/h5p-clamav-scanner`
package](/docs/packages/h5p-clamav-scanner.md).

The examples in `packages/h5p-examples` and `packages/h5p-rest-example-server`
can be configured to use it (see the package's docs for how to use it).

You can write you own implementations of the interface to use any other malware
scanner.

### Testing whether the malware scanners if correctly set up

There are test files in this repo that you can use to check whether your virus
scanner is set up correctly. These test files utilize [EICAR test
files](https://www.eicar.org/download-anti-malware-testfile/), which contain a
totally harmless special character sequency detected by virus scanner.

- `test/data/validator/h5p-with-virus.h5p`(/test/data/validator/h5p-with-virus.h5p):
contains an [EICAR test
file](https://www.eicar.org/download-anti-malware-testfile/) (as an image);
upload this H5P package through the package upload functionality; you should see
an error message explaining that the malware scanner has found something
- `packages/h5p-clamav-scanner/test/eicar.png`(/packages/h5p-clamav-scanner/test/eicar.png):
  is an [EICAR test
  file](https://www.eicar.org/download-anti-malware-testfile/); upload this
  image as a media file anywhere in the H5P editor; you should see an error
  message explaining that the malware scanner has found something

## CSRF

The H5P core library performs XHR calls with a session based on cookies, which
are vulnerable to cross site request forgery attacks, if you don't use CSRF
protection.

### CSRF tokens

You can add CSRF tokens to the URLs of XHR calls by enabling it in the
`UrlGenerator`'s constructor:

```ts
const urlGenerator = new UrlGenerator(
    h5pConfig,
    {
        protectAjax: true,
        protectContentUserData: true,
        protectSetFinished: true,
        queryParamGenerator: (user: IUser) => ({
            name: 'query_parameter_name';
            value: 'a_generated_csrf_token';
        })
    }
);
```

All URLs of vulnerable endpoints will then contain the token, e.g.
`https://example.org/h5p/some_api_call?query_parameter_name=a_generated_csrf_token`.
While using tokens in URLs is not ideal, as the tokens will be leaked in logs,
proxies (if you don't use TLS) and potentially Referrer Headers, there is no
alternative as the H5P core doesn't support using headers.

You can must then use a CSRF protection middleware to check for the token and reject
calls that don't contain it. The REST example contains a demonstration how to
wire everything up when using CSRF tokens.

### More modern CSRF protection

You should consider using Cookie settings like `SameSite=Strict` and/or restrict
API access to trusted origins with CORS.
