# h5p-redis-lock

This package provides a lock mechanism that can be used if the library runs in
multi-process or cluster-mode. The locks are needed to avoid race conditions
when installing libraries.

```ts
import ioredis from 'ioredis-mock';
import { H5PEditor, H5PPlayer } from '@lumieducation/h5p-server';
import RedisLockProvider from '@lumieducation/h5p-redis-lock';

// Create a regular ioredis connection
const redis = new ioredis(redisPort, redisHost, { db: redisDb });

// Create the lock provider
const lockProvider = new RedisLockProvider(redis);

// Pass it to the editor and player object
const h5pEditor = new H5PEditor( /*other parameters*/, options: { lockProvider } );
const h5pPlayer = new H5PPlayer( /*other parameters*/, options: { lockProvider } );
```

It is important to make sure that all instances of H5PEditor use a redis lock
provider that points to the same database. Otherwise race conditions can happen.