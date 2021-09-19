# Pure MongoDB library storage

There is an implementation of the `ILibraryStorage` interface that stores the
metadata **and files** of libraries in MongoDB. As the library files should
never be above the limit of MongoDB's binary data fields (~5 MB), we we don't
use GridFS. You can find the storage class in
[/packages/h5p-mongos3/src/MongoLibraryStorage.ts](/packages/h5p-mongos3/src/MongoLibraryStorage.ts).

There is another very similar storage class
[MongoS3LibraryStorage](mongo-s3-library-storage.md), which uses S3 to store
library files and might be a better fit if you have to storage very large
library files (none of the normal content types do!) or if you need to reduce
load on your MongoDB server.

## Dependencies

The implementation depends on this NPM package:

* mongodb

**You must add it manually to your application using `npm install mongodb`!**

## Usage

You must import the storage implementation:

```typescript
import { MongoLibraryStorage, initMongo } from '@lumieducation/h5p-mongos3';
```

or in classic JS style:

```javascript
const { MongoLibraryStorage, initMongo } = require('@lumieduation/h5p-mongos3');
```

Initialize the storage implementation like this:

```typescript
const storage = new MongoLibraryStorage(    
    (
        await initMongo(
            'mongodb://127.0.0.1:27017', // optional if env. variable is set
            'testdb1', // optional if env. variable is set
            'root', // optional if env. variable is set
            'h5pnodejs' // optional if env. variable is set
        )
    ).collection('h5p'),    
);
await storage.createIndexes();
```

You can safely call `createIndexes()` every time you start you application, as
MongoDB checks if indexes already exist before it creates new ones.

### Notes

* The function [`initMongo`](/packages/h5p-mongos3/src/initMongo.ts) creates a MongoDB client using the `mongodb` npm package.
* You can pass credentials and other configuration values to `initMongo` through the function parameters. Alternatively you can use these environment variables instead of using the function parameters:
  * MONGODB_URL
  * MONGODB_DB
  * MONGODB_USER
  * MONGODB_PASSWORD
* You can change the MongoDB collection name `h5p` to any name you want. If the collection doesn't exist yet, it will be automatically created.
* To achieve greater configurability, you can decide not to use `initMongo` and instantiate the required clients yourself.

## Using MongoLibraryStorage in the example

The [example Express application](/packages/h5p-examples/src/express.ts) can be
configured to use the MongoDB library storage by setting the environment variables
from above and these additional variables:

* LIBRARYSTORAGE=mongo
* LIBRARY_MONGO_COLLECTION

An example call would be:

```bash
MONGODB_URL="mongodb://127.0.0.1:27017" MONGODB_DB=testdb1 MONGODB_USER=root MONGODB_PASSWORD=h5pnodejs LIBRARYSTORAGE=mongo LIBRARY_MONGO_COLLECTION=h5p npm start
```

## Developing and testing

There are automated tests in
[`/test/implementation/db/MongoLibraryStorage.test.ts`](/packages/h5p-mongos3/test/MongoLibraryStorage.test.ts).
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
