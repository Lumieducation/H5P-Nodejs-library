# Getting Started

## Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/)
&gt;= 20, and [`npm`](https://www.npmjs.com/get-npm) installed. There might be
problems if you use `yarn` as it doesn't use the `package-lock.json` file and
you might get incorrect and untested dependencies.

**Important:** If you use Windows, you must use Bash (comes with Git for
windows) as a command shell (otherwise scripts won't run).

## Installation for development purposes

```bash
git clone https://github.com/lumieducation/h5p-nodejs-library
cd h5p-nodejs-library
npm install
```

This will install all dependencies in all packages, linking all
cross-dependencies and downloads test dependencies such as the h5p core and
editor library as well as content types.

## Structure of the repository

This repository is a [NPM
workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces) monorepo. A
monorepo is one repository for several packages, which can be found in the
`packages/` folder. Each subfolder is its own package, published via
[npm](https://www.npmjs.com). Packages are mostly self contained except for the
following cases:  

* NPM modules needed for every package are located in the root `package.json`
  and `node_module` folder. For example, the [jest](https://jestjs.io) testing
  framework and `typescript` are used in every package - therefore these are
  made accessible in every package.
* data used for unit and integration tests that are required by more than one
  package are located in `test/data`. Data used for only single packages is
  located in the respective `package/<name>/test/data` folder.

## Building the TypeScript files

You must transpile the TypeScript files to ES5 for the project to work (the
TypeScript transpiler will be installed automatically if you run `npm
install`):

```bash
npm run build
```

## Running the server-side-rendering example

To start the server-side-rendering example run

```bash
npm start
```

and open http://localhost:8080 in your browser.
