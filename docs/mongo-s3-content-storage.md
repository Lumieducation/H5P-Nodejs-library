# Using MongoDB and a S3-compatible system as content storage

There is an implementation of the `IContentStorage` interface that uses MongoDB
to store the parameters and metadata of content objects and a S3-compatible
storage system to store files (images, video, audio etc.). You can find it at
[/src/implementation/db/MongoS3ContentStorage.ts](/src/implementation/db/MongoS3ContentStorage.ts).

**Note:** You must create the S3 bucket manually before it can be used by
`MongoS3ContentStorage`!

## Dependencies

The implementation depends on these npm packages:

-   aws-sdk
-   mongodb

**You must add them manually to your application using `npm install aws-sdk mongodb`!**

## Usage

You must import the storage implementation via a submodule:

```ts
import dbImplementations from 'h5p-nodejs-library/build/src/implementation/db';
```

or in classic JS style:

```js
const dbImplementations = require('h5p-nodejs-library/build/src/implementation/db');
```

Note: The classes that depend on MongoDB and AWS-SDK are not exported in the
main module to avoid a dependency of h5p-nodejs-library on the `mongodb` and
`aws-sdk` packages.

Initialize the storage implementation like this:

```ts
const storage = new dbImplementations.MongoS3ContentStorage(
    dbImplementations.initS3({
        accessKeyId: 's3accesskey', // optional if env. variable is set
        secretAccessKey: 's3accesssecret', // optional if env. variable is set
        endpoint: 'http://127.0.0.1:9000', // optional if env. variable is set
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    }),
    (
        await dbImplementations.initMongo(
            'mongodb://127.0.0.1:27017', // optional if env. variable is set
            'testdb1', // optional if env. variable is set
            'root', // optional if env. variable is set
            'h5pnodejs' // optional if env. variable is set
        )
    ).collection('h5p'),
    { s3Bucket: 'h5pcontentbucket' }
);
```

### Notes:

-   The function [`initS3`](/src/implementation/db/initS3.ts) creates an S3
    client using the `aws-sdk` npm package.
-   The function [`initMongo`](/src/implementation/db/initMongo.ts) creates
    a MongoDB client using the `mongodb` npm package.
-   You can pass credentials and other configuration values to `initS3` and
    `initMongo` through the function parameters. Alternatively you can use these
    environment variables instead of using the function parameters:
    -   AWS_ACCESS_KEY_ID
    -   AWS_SECRET_ACCESS_KEY
    -   AWS_S3_ENDPOINT
    -   AWS_REGION
    -   MONGODB_URL
    -   MONGODB_DB
    -   MONGODB_USER
    -   MONGODB_PASSWORD
-   You can change the MongoDB collection name `h5p` to any name you want. If the
    collection doesn't exist yet, it will be automatically created.
-   You can change the bucket `h5pcontentbucket` to any name you want, but you
    must specify one. You must create the bucket manually before you can use it.
-   The configuration object passed into `initS3` is passed on to `aws-sdk`, so
    you can set any custom configuration values you want.
-   To achieve greater configurability, you can decide not to use `initS3` or
    `initMongo` and instantiate the required clients yourself.
-   While Amazon S3 supports keys with up to 1024 characters, some other S3
    systems such as Minio might only support less in certain situations. To
    cater for these system you can set the option `maxKeyLength` to the value
    you need. It defaults to 1024.

## Using MongoS3ContentStorage in the example

The [example Express application](/examples/express.ts) can be configured to
use the MongoDB/S3 storage by setting the environment variables from above and
these additional variables:

-   CONTENTSTORAGE=mongos3
-   CONTENT_MONGO_COLLECTION
-   CONTENT_AWS_S3_BUCKET

An example call would be:

```sh
CONTENTSTORAGE=mongos3 AWS_ACCESS_KEY_ID=minioaccesskey AWS_SECRET_ACCESS_KEY=miniosecret AWS_S3_ENDPOINT="http://127.0.0.1:9000" MONGODB_URL="mongodb://127.0.0.1:27017" MONGODB_DB=testdb1 MONGODB_USER=root MONGODB_PASSWORD=h5pnodejs CONTENT_AWS_S3_BUCKET=testbucket1 CONTENT_MONGO_COLLECTION=h5p npm start
```

## Customizing permissions

By default the storage implementation allows all users read and write access to
all data! It is very likely that this is not something you want!
You can add a function to the options object of the constructor of
`MongoS3ContentStorage` to customize access restrictions:

```ts
getPermissions = (
    contentId: ContentId,
    user: IUser
) => Promise<Permission[]>;
```

The function receives the contentId of the object that is being accessed and the
user who is trying to access it. It must return a list of permissions the user
has on this object. Your implementation of this function will probably be an
adapter that hooks into your rights and permission system.

## Increasing scalability by getting content files directly from S3

In the default setup all resources used by H5P content in the **player** (images,
video, ...) will be requested from the H5P server. The H5P server in turn will
request the resources from S3 and relay the results. This means that in a high
load scenario, there will be a lot of load on the H5P server to serve these
static files. You can improve scalability by setting up the player to load
content resources directly from the S3 bucket. For this you must grant read
access on the bucket to anonymous users. If you have content that must not
be accessible to the public (for e.g. copyright reasons), this is probably not
an option.

This currently only works for the player, not for the editor. Because of this
you must still serve the 'get content file' route to make sure the editor can
work with resources correctly.

Steps:

1. Grant read-only permission to anonymous users for your bucket with bucket
   policies. See the [AWS documentation for details](https://docs.aws.amazon.com/AmazonS3/latest/dev/example-bucket-policies.html#example-bucket-policies-use-case-2).
2. Set the configuration option `contentFilesUrlPlayerOverride` to point to your
   S3 bucket. The URL must also include the contentID of the object. For this,
   you must add the placeholder `{{contentId}}` to the configuration value. Examples:

```ts
contentFilesUrlPlayerOverride = 'https://bucket.s3server.com/{{contentId}}';
// or
contentFilesUrlPlayerOverride = 'https://s3server.com/bucket/{{contentId}}';
```

## Developing and testing

There are automated tests in [`/test/implementation/db/MongoS3ContentStorage.test.ts`](/test/implementation/db/MongoS3ContentStorage.test.ts).
However, these tests will not be called automatically when you run `npm run test`
or other test calls. The reason is that the tests require a running MongoDB and S3
instance and thus need more extensive setup. To manually execute the tests
call `npm run test:db`.

To quickly get a functioning MongoDB and S3 instance, you can use the [Docker
Compose file in the same directory](/test/implementation/db/mongo-s3-docker-compose.yml)
like this (you obviously must install [Docker](https://docs.docker.com/engine/install/)
and [Docker Compose](https://docs.docker.com/compose/install/) first):

```sh
docker-compose -f test/implementation/db/mongo-s3-docker-compose.yml up -d
```

This will start a MongoDB server and MinIO instance in containers. Note that the
instances will now be started when your system boots. To stop them from doing
this and completely wipe all files from your system, execute:

```sh
docker-compose -f /test/implementation/db/mongo-s3-docker-compose.yml down -v
```

The MinIO instance will not include a bucket by default. You can create one
with the [GUI tool "S3 Browser"](https://s3browser.com/), for example, or
with the AWS CLI.
