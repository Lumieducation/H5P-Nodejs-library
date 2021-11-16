# H5P-Nodejs-library

[![CircleCI](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master.svg?style=svg)](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master) [![Coverage Status](https://coveralls.io/repos/github/Lumieducation/H5P-Nodejs-library/badge.svg?branch=master)](https://coveralls.io/github/Lumieducation/H5P-Nodejs-library?branch=master)

This library provides everything needed to create custom H5P servers running on
NodeJS. It is written in TypeScript and fully typed, which makes it much easier
to work with than the official PHP server. Of course, it's also possible to use
this library in projects with JavaScript (ES5) and you will still profit from
the typings by getting code completion in your IDE.

Even though the repository includes a sample demo project that demonstrates its
functionality, it's still your job to integrate this library into your own
NodeJS server. This is called an "implementation" or "plugin" in H5P
terminology. The implementation is responsible for exposing HTTP endpoints,
persisting data and calling maintenance functions. **This library is not an
out-of-the-box solution to get a standalone H5P server.**

**Check out the [GitBook documentation](https://docs.lumi.education) for details
on how to use this library**.

Please note that even if most functionality of H5P works, **there are parts
which haven't been implemented yet or which might be faulty.** This is
particularly true for security concerns. For a more comprehensive list of what
works and what doesn't, check out [the documentation page on the current status
of the project](/docs/development/status.md). The interfaces have reached some
level of stability, but might still change in future major releases.

## Packages

The main Git repository is a monorepo that contains several packages, which can
be installed through NPM. The packages are meant to be combined 

| Package name                      | Functionality                                                             | used in  |
|-----------------------------------|---------------------------------------------------------------------------|----------|
| **@lumieducation/h5p-server**         | the core package to run H5P in NodeJS                                     | backend  |
| **@lumieducation/h5p-express**        | routes and controllers for Express                                        | backend  |
| **@lumieducation/h5p-webcomponents**  | native web components to display the H5P player and editor in the browser | frontend |
| **@lumieducation/h5p-react**          | React components with the same functionality as the native web components | frontend |
| **@lumieducation/h5p-mongos3**        | storage classes for MongoDB and S3                                        | backend  |
| **@lumieducation/h5p-redis-lock**     | storage class for locks with Redis                                        | backend  |
| **@lumieducation/h5p-html-exporter**  | an optional component that can create bundled HTML files for exporting    | backend  |

## Examples

There are two example implementations that illustrate how the packages can be
used:

| Example type | Tech stack | Location |
| :--- | :--- | :--- |
| server-side-rendering | server: Express with JS template rendering client: static HTML, some React for library management | `/packages/h5p-examples` |
| [Single Page Application](examples/rest/README.md) | server: Express with REST endpoints client: React | `/packages/h5p-rest-example-server` `/packages/h5p-rest-example-client` |

## Trying out the demo

Make sure you have [`git`](https://git-scm.com/), [`node ≥ 10.16`](https://nodejs.org/)
, and [`npm`](https://www.npmjs.com/get-npm) installed. If you use
Windows, you must use bash (comes with Git for windows) as a command shell
(otherwise scripts won't run).

1. Clone the repository with git
2. `npm install`
3. `npm start`

You can then open the URL [http://localhost:8080](http://localhost:8080) in any
browser.

## Contributing

Lumi tries to improve education wherever it is possible by providing a software
that connects teachers with their students. Every help is appreciated and
welcome. Feel free to create pull requests. Check out the [documentation pages
for developers](/docs/development/getting-started.md) to get started.

This project has adopted the code of conduct defined by the Contributor
Covenant. It can be read in full [here](/code-of-conduct.md).

## Get in touch

[Slack](https://join.slack.com/t/lumi-education/shared_invite/zt-3dcc4gpy-8XxjefFeUHEv89hCMkwmbw)
or [c@Lumi.education](mailto:c@lumi.education).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/Lumieducation/Lumi/tags).

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE v3 License - see
the [LICENSE](/LICENSE) file for details

## Support

This work obtained financial support for development from the German
BMBF-sponsored research project "CARO - Care Reflection Online" (FKN:
01PD15012).

Read more about them at the following websites:

* CARO - [https://blogs.uni-bremen.de/caroprojekt/](https://blogs.uni-bremen.de/caroprojekt/)
* University of Bremen - [https://www.uni-bremen.de/en.html](https://www.uni-bremen.de/en.html)
* BMBF - [https://www.bmbf.de/en/index.html](https://www.bmbf.de/en/index.html)
