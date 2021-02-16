# Getting Started

## Prerequisites

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/) &gt;= 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed. There might be problems if you use `yarn` as it doesn't use the `package-lock.json` file and you might get incorrect and untested dependencies.

**Important:** If you use Windows, you must use Bash \(comes with Git for windows\) as a command shell \(otherwise scripts won't run\).

## Installation for development purposes

```bash
git clone https://github.com/Lumieducation/h5p-nodejs-library
cd h5p-nodejs-library
npm install
```

This will install all dependencies in all packages, run lerna's [bootstrap](https://lerna.js.org/#command-bootstrap) command, linking all cross-dependencies and downloads test-dependencies such as the h5p core and editor library as well as content types.

## Structure of the repository

This repository is a so called monorepo and is managed by [lerna](https://lerna.js.org). A monorepo is one repository for several packages, which can be found in the `packages/` folder. Each subfolder is its own package, published via [npm](https://www.npmjs.com). Packages are mostly self contained except for the following cases:  


* node modules needed for every package are located in the root `package.json` and `node_module` folder. The[ jest](https://jestjs.io) testing framework and `typescript` are used in every package - therefore these are installed in the root `node_module` folder and made accessible in every package.
* data used for unit and integration tests that are required by more than one package are located in `test/data`. Data used for only single packages is located in the respective `package/<name>/test/data` folder.





