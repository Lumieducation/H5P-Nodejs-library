# Using MongoDB and S3-compatible storage as content storage

There is an implementation of the `IContentStorage` interface that uses MongoDB
to store the parameters and metadata of content objects and a S3-compatible
storage system to store files (images, video, audio etc.). You can find it at
[/src/implementation/db/MongoS3ContentStorage.ts](/src/implementation/db/MongoS3ContentStorage.ts).

## Dependencies

The implementation depends on these npm packages:

-   aws-sdk
-   mongodb

Add them to your application using `npm install aws-sdk mongodb`.

## Usage

Initialize the storage implementation like this:

```ts
const storage = new H5P.dbImplementations.MongoS3ContentStorage(
    H5P.dbImplementations.initS3({
        accessKeyId: 's3accesskey',
        secretAccessKey: 's3accesssecret',
        endpoint: 'http://127.0.0.1:9000',
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    }),
    (
        await H5P.dbImplementations.initMongo(
            'mongodb://127.0.0.1:27017',
            'testdb1',
            'root',
            'h5pnodejs'
        )
    ).collection('h5p'),
    { s3Bucket: 'h5p-content-bucket' }
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
-   You can change the MongoDB collection `h5p` to any name you want. If the
    collection doesn't exist yet, it will be automatically created.
-   You can change the bucket `h5p-content-bucket` to any name you want, but you
    must specify one. You must create the bucket manually before you can use it.
-   The configuration object passed into `initS3` is passed on to `aws-sdk`, so
    you can set any custom configuration values you want.
-   To achieve greater configurability, you can decide not to use `initS3` or
    `initMongo` and instantiate the required clients yourself.
