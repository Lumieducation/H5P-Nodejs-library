---
title: Performance optimizations
group: Documents
category: Advice
---

# Performance optimizations for production use

There are a few ways in which the performance of `@lumieducation/h5p-server` can
be improved:

- [Performance optimizations for production use](#performance-optimizations-for-production-use)
  - [Caching library storage](#caching-library-storage)
  - [Serving the library files from a different system](#serving-the-library-files-from-a-different-system)
  - [Horizontal scaling](#horizontal-scaling)
  - [Database-based content storage](#database-based-content-storage)

## Caching library storage

The {@link @lumieducation/h5p-server!cacheImplementations.CachedLibraryStorage} class can be used to
cache the most common calls to the library storage. This will improve the
overall performance of the library quite a bit, as many functions need library
metadata, semantics or language files, which they get from the library storage.
When used for complex content types like Course Presentation, the `GET
/ajax?action=libraries` endpoint becomes around 40x faster if you use the cached
library storage!

The class uses [the NPM package
`cache-manager`](https://www.npmjs.com/package/cache-manager) to abstract the
caching, so you can pass in any of the store engines supported by it (e.g.
redis, mongodb, fs, memcached). See the documentation page of `cache-manager`
for more details.

This is how you use the storage:

```javascript
import * as H5P from '@lumieducation/h5p-server';

const cachedStorage = new H5P.cacheImplementations.CachedLibraryStorage(
    new H5P.fsImplementations.FileLibraryStorage(localLibraryPath)
    // you can also pass in other implementation of ILibraryStorage
);
```

Check out how to construct the H5PEditor with the storage
[here](../usage/h5p-editor-constructor.md).

## Serving the library files from a different system

While you can use the inbuilt methods of `@lumieducation/h5p-server` to serve the
library files (JavaScript and CSS files used by the actual content types) to
the browser of the user, it is also possible to serve them directly, as they are
simple static files.

If you construct {@link @lumieducation/h5p-server!fsImplementations.FileLibraryStorage} with

`new FileLibraryStorage('/directory/in/filesystem')`

all libraries will be stored in `/directory/in/filesystem`. You can simply serve
this directory under the URL specified in `IH5PConfig.librariesUrl` (defaults
to `/libraries`). If you put this directory into a NFS storage or a shared
volume, you can even use different machines to serve the library files
(vertical scaling)!

You must make sure that patches to libraries that have changed the library files
aren't lost due to caching.

## Horizontal scaling

It is possible to use `@lumieducation/h5p-server` in a setup in which multiple
instances of it are executed in parallel (on a single machine to make use of
multi-core processors or on multiple machines). When doing this, pay attention
to this:

- If you use [caching](#caching-library-storage), you have to use a cache like
  Redis or memcached. Cache invalidation across multiple instances will not work
  with the simple default in-memory cache.
- If you run multiple instances on a single machine, the library storage
  directory can be on the local filesystem and all instances can share it.
- If you run multiple instances on multiple machines, the library storage
  directory must be put into a network share (NFS) or you must use shared
  volumes (Docker).
- It is advised to use the Mongo/S3 content storage classes. [See
  below](#database-based-content-storage) for details.

## Database-based content storage

The simple {@link
@lumieducation/h5p-server!fsImplementations.FileContentStorage} and {@link
@lumieducation/h5p-server!fsImplementations.DirectoryTemporaryFileStorage} are
not suitable for production use, as they suffer from serious scaling issues when
listing content objects. They should only be used for development and testing
purposes or in very small deployments.

It is advised to use the {@link
@lumieducation/h5p-mongos3!MongoS3ContentStorage} and {@link
@lumieducation/h5p-mongos3!S3TemporaryFileStorage} classes of the h5p-mongos3
package. You can also write your own custom content storage and temporary file
storage classes for other databases.
