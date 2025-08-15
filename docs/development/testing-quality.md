---
title: Testing & Code quality
group: Documents
category: Contributing
---

# Testing and code quality

## Running Tests

After installation, you can run the tests with

```bash
npm run test
npm run test:integration
npm run test:e2e
npm run test:h5p-mongos3 # (require running MongoDB server)
```

You can run the e2e tests with h5p packages on your local system like this:

```bash
H5P_FILES=test/data/hub-content ERROR_FILE=errors.txt npm run test:server+upload
```

## Code quality

We aim at achieving high code quality by following these principles:

- All public methods and all classes must contain JSDoc comments that contain a full documentation of the entity's function, all of its parameters and return
  values.
- We try to follow the patterns of object oriented programming.
- All code must be formatted by prettier.
- All code must pass the TS Lint checks.
- Every piece of functionality that is added to the library should be covered by a test.
- When fixing a bug, a test proving that the bug has been fixed should be added to the project whenever possible.
- All logical code branches should be covered by test except.
- All tests should be part of the CI pipeline.
- All code that is merged into master must pass the CI pipeline's tests.

You can check whether your own code passes most of these requirements by running
`npm run ci` (doesn't include tests requiring a database).
