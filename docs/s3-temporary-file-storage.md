# Using a S3-compatible system as temporary file storage

There is an implementation of the `ITemporaryFileStorage` interface that uses a
S3-compatible storage system to store files (images, video, audio etc.) that are
uploaded in the editor. These files are later copied to the permanent
content storage once the users save their changes.
You can find it at
[/src/implementation/db/S3TemporaryFileStorage.ts](/src/implementation/db/S3TemporaryFileStorage.ts).

**Note:** You must create the S3 bucket manually before it can be used by
`S3TemporaryFileStorage`! **It's also your responsibility to configure the
bucket to automatically delete old temporary files after a sensible timespan
(e.g. 1 day).**

## Dependencies

The implementation depends on this npm package:

-   aws-sdk

**You must add it manually to your application using `npm install aws-sdk`!**

## Usage

You must import the storage implementation via a submodule:

```ts
import dbImplementations from 'h5p-nodejs-library/build/src/implementation/db';
```

or in classic JS style:

```js
const dbImplementations = require('h5p-nodejs-library/build/src/implementation/db');
```

Note: The classes that depend on AWS-SDK are not exported in the
main module to avoid a dependency of h5p-nodejs-library on the `aws-sdk`
package.

Initialize the storage implementation like this:

```ts
const temporaryStorage = new dbImplementations.S3TemporaryFileStorage(
    dbImplementations.initS3({
        accessKeyId: 's3accesskey', // optional if env. variable is set
        secretAccessKey: 's3accesssecret', // optional if env. variable is set
        endpoint: 'http://127.0.0.1:9000', // optional if env. variable is set
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    }),
    { s3Bucket: 'h5ptemporarybucket' }
);
```

### Notes:

-   The function [`initS3`](/src/implementation/db/initS3.ts) creates an S3
    client using the `aws-sdk` npm package.
-   You can pass credentials and other configuration values to `initS3` and
    through the function parameters. Alternatively you can use these
    environment variables instead of using the function parameters:
    -   AWS_ACCESS_KEY_ID
    -   AWS_SECRET_ACCESS_KEY
    -   AWS_S3_ENDPOINT
    -   AWS_REGION
-   You can change the bucket `h5ptemporarybucket` to any name you want, but you
    must specify one. You must create the bucket manually before you can use it.
-   The configuration object passed into `initS3` is passed on to `aws-sdk`, so
    you can set any custom configuration values you want.
-   To achieve greater configurability, you can decide not to use `initS3` or
    and instantiate the required client yourself.
-   While Amazon S3 supports keys with up to 1024 characters, some other S3
    systems such as Minio might only support less in certain situations. To
    cater for these system you can set the option `maxKeyLength` to the value
    you need. It defaults to 1024.

## Using S3TemporaryFileStorage in the example

The [example Express application](/examples/express.ts) can be configured to
use the S3 temporary storage by setting the environment variables from above and
these additional variables:

-   TEMPORARYSTORAGE=s3
-   TEMPORARY_AWS_S3_BUCKET

An example call would be:

```sh
TEMPORARYSTORAGE=s3 AWS_ACCESS_KEY_ID=minioaccesskey AWS_SECRET_ACCESS_KEY=miniosecret AWS_S3_ENDPOINT="http://127.0.0.1:9000" TEMPORARY_AWS_S3_BUCKET=h5ptemporarybucket npm start
```

## Customizing permissions

By default the storage implementation allows all users read access to all files
and every use can create new temporary files! It is very possible that this is
not something you want! You can add a function to the options object of the
constructor of `S3TemporayStorage` to customize access restrictions:

```ts
    getPermissions: (
        userId: string,
        filename?: string
    ) => Promise<Permission[]>;
```

The function receives the userId of the user who is trying to access a filename.
It must return a list of permissions the user has on the file. Your
implementation of this function will probably be an adapter that hooks into your
rights and permission system.
