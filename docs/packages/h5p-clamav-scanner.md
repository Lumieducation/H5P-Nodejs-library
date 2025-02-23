# Virus scanner using ClamAV

This package implements the `IFileMalwareScanner` malware scanning interface of
the @lumieducation/h5p-server package by calling a
[ClamAV](https://www.clamav.net/) scanner. ClamAV can be either installed on the
host, called through a UNIX socket or a TCP socket. The package is a light
wrapper around the NPM package
[clamscan](https://www.npmjs.com/package/clamscan).

## ClamAV's security level

ClamAV's detection rate [is really
bad](https://anti-malware-alliance.org/2024/10/04/clamav-how-effective-it-is-a-look-into-its-detection-rate/).
You'd be well advised to find some other antivirus software that you can use
that has a higher detection rate. Sadly, this nearly always means you have to
use a paid cloud-based scanning service, which might not be an option for you.
So if you aren't able to use another antivirus system, using ClamAV probably is
still better than nothing.

If you have another anti-virus scanner, you can use the h5p-clamav-scanner
package as a base for implementing the `IFileMalwareScanner` interface. We're
interested in pull requests with other implementations!

## Usage

```ts
import ClamAVScanner from '@lumieducation/clamav-scanner';

// There is no public constructor as the initialization is async.
// That's why we have to use an async factory method.
const clamAVScanner = await clamAVScanner.create();

const h5pEditor = new H5PEditor(
    // ... regular configuration ...
    // Add the scanner to the options parameter
    {
        malwareScanners: [ clamAVScanner ]
    }
);
```

## Configuration

You can configure the module in code or through environment variables.
Environment variables take precedence over configuration in code.

See the [clamscan docs](https://www.npmjs.com/package/clamscan) for more
information about the configuration.

### In Code

You can specify options in the factory:

```ts
const clamAVScanner = await clamAVScanner.create({
    clamdscan: {
        host: 'clamav-hostname',
        port: 3310
    }
});
```

### Through environment variables

You can also set options by setting these environment variables:

General options:

- **CLAMSCAN_SCAN_LOG**: Path to a writeable log file to write scan results into
- **CLAMSCAN_DEBUG_MODE**: Whether or not to log ClamAV's info/debug/error msgs
  to the console
- **CLAMSCAN_PREFERENCE**: clamscan or clamdscan (if clamdscan is configured, it
  will always be preferred)

To use a local `clamscan` binary:

- **CLAMSCAN_PATH**: Path to clamscan binary on your server
- **CLAMSCAN_DB**: Path to a custom virus definition database
- **CLAMSCAN_SCAN_ARCHIVES**: If true, scan archives (ex. zip, rar, tar, dmg,
  iso, etc...)
- **CLAMSCAN_ACTIVE**: If true, this module will consider using the clamscan
  binary

To use `clamdscan` with UNIX socket or TCP:

- **CLAMDSCAN_SOCKET**: Socket file for connecting via TCP
- **CLAMDSCAN_HOST**: IP of host to connect to TCP interface
- **CLAMDSCAN_PORT**: Port of host to use when connecting via TCP interface
- **CLAMDSCAN_TIMEOUT**: Timeout for scanning files in ms
- **CLAMDSCAN_LOCAL_FALLBACK**: Use local preferred binary to scan if socket/tcp
  fails
- **CLAMDSCAN_PATH**: Path to the clamdscan binary on your server
- **CLAMDSCAN_CONFIG_FILE**: Specify config file if it's in an unusual place
- **CLAMDSCAN_MULTISCAN**: Scan using all available cores
- **CLAMDSCAN_RELOAD_DB**: If true, will re-load the DB on every call (slow)

## Example

The examples in `packages/h5p-examples` and `packages/h5p-rest-example-server`
can be configured to use the ClamAV scanner class. Start the example like this:

```sh
CLAMSCAN_ENABLED=true npm start
```

Note:

- The `CLAMSCAN_ENABLED` environment variable is part of the example code and
won't work if you don't add specific support for it. It triggers the creation of
a `ClamAVScanner` instance. You can use the other environment variables to
configure the `ClamAVScanner` instance as needed.
- Malware scanning only works of you pass uploaded content files to
`H5PEditor.saveContentFile` as temporary files, not as in-memory streams.
Temporary file uploads are used by default, in the example (and could be
disabled with the environment variable TEMP_UPLOADS=false). The environment
variable TEMP_UPLOADS is part of the example code and won't work in your custom
implementation, if you don't add explicit support for it.
