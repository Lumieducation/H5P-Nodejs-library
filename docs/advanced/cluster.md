# Running the example in cluster mode

The example can (mostly) be run in cluster mode to scale h5p horizontally.

The only thing that hasn't been made to work across is the configuration object.
(This shouldn't be a problem, as the only thing that is written back in the
config is the UID of the server, which is already built in for development
purposes.) All other components support scaling across several instances.

You'll need:

* Docker
* Docker Compose

You can access the application by calling
[http://localhost:8080](http://localhost:8080) from your browser.

## Commands

Change directories to the directory that contains the `docker-compose.yml` file.
(`packages/h5p-examples/cluster-mode`)

### Startup (fires up 4 instances of h5p)

```bash
docker-compose up --scale h5p=4
```

### Startup (also rebuilds image)

Execute this command after you've made changes to the code that require a
rebuild

```bash
docker-compose up --scale h5p=4 --build
```

### Shutdown

```bash
docker-compose down
```

### Shutdown (and delete all data)

```bash
docker-compose down -v
```

## How it works

The `docker-compose.yml` file configures a setup in which there are several
services that make @lumieducation/h5p-server work in cluster mode:

- Minio (provides S3 storage backend for content, temporary and library files)
- MongoDB (provides database backend for content and library metadata)
- Redis (provides a key-value cache; used for caching the content type cache and
  caching library metadata; used as a locking mechanism across containers)
- a named Docker volume (added as a volume to all h5p containers to keep library
  data consistent across instances)
- NGINX (load balancer that distributes incoming request between the H5P
  containers)
