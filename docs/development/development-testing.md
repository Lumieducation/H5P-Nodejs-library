# Development & Testing

## Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/)
&gt;= 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed. There might
be problems if you use `yarn` as it doesn't use the `package-lock.json` file and
you might get incorrect and untested dependencies.

**Important:** If you use Windows, you must use Bash \(comes with Git for
windows\) as a command shell \(otherwise scripts won't run\).

## Installation for development purposes

```bash
git clone https://github.com/Lumieducation/h5p-nodejs-library
cd h5p-nodejs-library
npm install
```

This will install all dependencies and transpile the source files.

## Building the TypeScript files

You must transpile the TypeScript files to ES5 for the project to work \(the
TypeScript transpiler will be installed automatically if you run `npm
install`\):

```bash
npm run build
```

## Running Tests

After installation, you can run the tests with

```bash
npm run test
npm run test:integration
npm run test:e2e
npm run test:db # (require running MongoDB server)
```

You can run the e2e tests with h5p packages on your local system like this:

```bash
H5P_FILES=test/data/hub-content ERROR_FILE=errors.txt npm run test:server+upload
```

## Debugging

The library emits log messages with
[debug](https://www.npmjs.com/package/debug). To see those messages you have to
set the environment variable `DEBUG` to `h5p:*`. There are several log levels.
By default you'll only see the messages sent with the level `info`. To get the
verbose log, set the environment variable `LOG_LEVEL` to debug \(mind the
capitalization\).

Example \(for Linux\):

```bash
DEBUG=h5p:* LOG_LEVEL=debug node script.js
```

## Other scripts

Check out the many other npm scripts in [package.json](/package.json) for other
development functionality.

## Core updates

Check out [this page](core-updates.md) for more details on how to update the
H5P core files when there is a new release of the H5P core or the H5P editor
core.

## Code quality

We aim at achieving high code quality by following these principles:

* All public methods and all classes must contain JSDoc comments that contain a
  full documentation of the entity's function, all of its parameters and return
  values.
* We try to follow the patterns of object oriented programming.
* All code must be formatted by prettier.
* All code must pass the TS Lint checks.
* Every piece of functionality that is added to the library should be covered by
  a test.
* When fixing a bug, a test proving that the bug has been fixed should be added
  to the project whenever possible.
* All logical code branches should be covered by test except.
* All tests should be part of the CI pipeline.
* All code that is merged into master must pass the CI pipeline's tests.

You can check whether your own code passes most of these requirements by running
`npm run ci` \(doesn't include tests requiring a database\).
