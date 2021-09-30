# MongoDB + S3 library storage

There is an implementation of the `ILibraryStorage` interface that stores the
metadata of libraries in MongoDB and the files in S3. You can find the storage
class in
[/packages/h5p-mongos3/src/MongoS3LibraryStorage.ts](/packages/h5p-mongos3/src/MongoS3LibraryStorage.ts).

There is another very similar storage class
[MongoLibraryStorage](mongo-library-storage.md), which doesn't use S3 and might
be better in many use cases, in particular if you S3 service is too slow or if
you pay per request.

## Dependencies

The implementation depends on these npm packages:

* aws-sdk
* mongodb

**You must add them manually to your application using `npm install aws-sdk
mongodb`!**

## Usage

You must import the storage implementation:

```typescript
import { MongoS3LibraryStorage, initS3, initMongo } from '@lumieducation/h5p-mongos3';
```

or in classic JS style:

```javascript
const { MongoS3LibraryStorage, initS3, initMongo } = require('@lumieduation/h5p-mongos3');
```

Initialize the storage implementation like this:

```typescript
const storage = new MongoLibraryStorage(        
    initS3({
        accessKeyId: 's3accesskey', // optional if env. variable is set
        secretAccessKey: 's3accesssecret', // optional if env. variable is set
        endpoint: 'http://127.0.0.1:9000', // optional if env. variable is set
        s3ForcePathStyle: true,
        signatureVersion: 'v4'
    }),
    ( await initMongo(
        'mongodb://127.0.0.1:27017', // optional if env. variable is set
        'testdb1', // optional if env. variable is set
        'root', // optional if env. variable is set
        'h5pnodejs' // optional if env. variable is set
    )).collection('h5p'),
    { s3Bucket: 'h5plibrarybucket' }
);
await storage.createIndexes();
```

You can safely call `createIndexes()` every time you start you application, as
MongoDB checks if indexes already exist before it creates new ones.

### Notes

* The function [`initS3`](/packages/h5p-mongos3/src/initS3.ts) creates an S3 client using the `aws-sdk` npm package.
* The function [`initMongo`](/packages/h5p-mongos3/src/initMongo.ts) creates a MongoDB client using the `mongodb` npm package.
* You can pass credentials and other configuration values to `initMongo` through the function parameters. Alternatively you can use these environment variables instead of using the function parameters:
  * AWS_ACCESS_KEY_ID
  * AWS_SECRET_ACCESS_KEY
  * AWS_S3_ENDPOINT
  * AWS_REGION
  * MONGODB_URL
  * MONGODB_DB
  * MONGODB_USER
  * MONGODB_PASSWORD
* You can change the MongoDB collection name `h5p` to any name you want. If the collection doesn't exist yet, it will be automatically created.
* You can change the bucket `h5plibrarybucket` to any name you want, but you must specify one. You must create the bucket manually before you can use it.
* The configuration object passed into `initS3` is passed on to `aws-sdk`, so you can set any custom configuration values you want.
* To achieve greater configurability, you can decide not to use `initS3` or `initMongo` and instantiate the required clients yourself.
* While Amazon S3 supports keys with up to 1024 characters, some other S3 systems such as Minio might only support less in certain situations. To cater for these system you can set the option `maxKeyLength` to the value you need. It defaults to 1024.

## Using MongoLibraryStorage in the example

The [example Express application](/packages/h5p-examples/src/express.ts) can be
configured to use the MongoDB library storage by setting the environment variables
from above and these additional variables:

* LIBRARYSTORAGE=mongos3
* LIBRARY_MONGO_COLLECTION
* LIBRARY_MONGO_COLLECTION
* LIBRARY_AWS_S3_BUCKET

An example call would be:

```bash
MONGODB_URL="mongodb://127.0.0.1:27017" MONGODB_DB=testdb1 MONGODB_USER=root MONGODB_PASSWORD=h5pnodejs LIBRARYSTORAGE=mongos3 LIBRARY_MONGO_COLLECTION=h5p LIBRARY_AWS_S3_BUCKET=h5plibrarybucket npm start
```

## Developing and testing

There are automated tests in
[`/test/implementation/db/MongoS3LibraryStorage.test.ts`](/packages/h5p-mongos3/test/MongoS3LibraryStorage.test.ts).
However, these tests will not be called automatically when you run `npm run
test` or other test calls. The reason is that the tests require a running
MongoDB and S3 instance and thus need more extensive setup. To manually execute
the tests call `npm run test:db`.

To quickly get a functioning MongoDB instance, you can use the [Docker
Compose file in the scripts directory](/scripts/mongo-s3-docker-compose.yml)
like this (you obviously must install
[Docker](https://docs.docker.com/engine/install/) and [Docker
Compose](https://docs.docker.com/compose/install/) first):

```bash
docker-compose -f scripts/mongo-s3-docker-compose.yml up -d
```

This will start a MongoDB server and MinIO instance in containers. Note that the
instances will now be started when your system boots. To stop them from doing
this and completely wipe all files from your system, execute:

```bash
docker-compose -f scripts/mongo-s3-docker-compose.yml down -v
```
