# @lumieducation/h5p-server

[![Coverage Status](https://coveralls.io/repos/github/Lumieducation/H5P-Nodejs-library/badge.svg?branch=master)](https://coveralls.io/github/Lumieducation/H5P-Nodejs-library?branch=master)

This library provides everything needed to create custom H5P servers running on
NodeJS. It is written in TypeScript and fully typed, which makes it much easier
to work with than the official PHP server. Of course, it's also possible to use
this library in projects with JavaScript (ES5) and you will still profit from
the typings by getting code completion in your IDE.

The library is not an out-of-the-box solution to get a standalone H5P
application. It's still your job to integrate this library into your own NodeJS
server. This is called an "implementation" or "plugin" in H5P terminology. The
implementation is responsible for exposing HTTP endpoints, persisting data and
calling maintenance functions. **This library is not an out-of-the-box solution
to get a standalone H5P server.**

**Check out the [GitBook documentation](https://docs.lumi.education) for details
on how to use this library**.

## Additional related packages

@lumieducation/h5p-server is one of several packages by Lumi Education that work
in conjunction to simplify creating H5P applications. They are all managed in
the [h5p-nodejs-library monorepo on
GitHub](https://github.com/lumieducation/h5p-nodejs-library) and are available
on NPM.

| Package name                      | Functionality                                                             | used in  |
|-----------------------------------|---------------------------------------------------------------------------|----------|
| [**@lumieducation/h5p-server**](https://www.npmjs.com/package/@lumieducation/h5p-server)         | the core package to run H5P in NodeJS                                     | backend  |
| [**@lumieducation/h5p-express**](https://www.npmjs.com/package/@lumieducation/h5p-express)        | routes and controllers for Express                                        | backend  |
| [**@lumieducation/h5p-webcomponents**](https://www.npmjs.com/package/@lumieducation/h5p-webcomponents)  | native web components to display the H5P player and editor in the browser | frontend |
| [**@lumieducation/h5p-react**](https://www.npmjs.com/package/@lumieducation/h5p-react)          | React components with the same functionality as the native web components | frontend |
| [**@lumieducation/h5p-mongos3**](https://www.npmjs.com/package/@lumieducation/h5p-mongos3)        | storage classes for MongoDB and S3                                        | backend  |
| [**@lumieducation/h5p-html-exporter**](https://www.npmjs.com/package/@lumieducation/h5p-html-exporter)  | an optional component that can create bundled HTML files for exporting    | backend  |

## Examples

There are two example implementations that illustrate how the packages can be
used:

| Example type | Tech stack | Location |
| :--- | :--- | :--- |
| server-side-rendering | server: Express with JS template rendering client: static HTML, some React for library management | [`/packages/h5p-examples`](https://github.com/Lumieducation/H5P-Nodejs-library/tree/master/packages/h5p-examples) |
| [Single Page Application](https://docs.lumi.education/development/rest) | server: Express with REST endpoints client: React | [`/packages/h5p-rest-example-server`](https://github.com/Lumieducation/H5P-Nodejs-library/tree/master/packages/h5p-rest-example-server) [`/packages/h5p-rest-example-client`](https://github.com/Lumieducation/H5P-Nodejs-library/tree/master/packages/h5p-rest-example-server) |

## Versioning

We use [SemVer](http://semver.org/) for versioning. The versions of all packages
of the monorepo are all increased at the same time, so you should always update
all packages at once. For the versions available, see the [tags on this
repository](https://github.com/Lumieducation/h5p-nodejs-library/tags).

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
