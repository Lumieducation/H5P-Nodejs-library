# H5P-Nodejs-library

[![CircleCI](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master.svg?style=svg)](https://circleci.com/gh/Lumieducation/H5P-Nodejs-library/tree/master)
[![Coverage
Status](https://coveralls.io/repos/github/Lumieducation/H5P-Nodejs-library/badge.svg?branch=master)](https://coveralls.io/github/Lumieducation/H5P-Nodejs-library?branch=master)

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

Please note that even if most functionality of H5P seems to work, **there are
parts which haven't been implemented yet or which might be faulty.** This is
particularly true for security concerns. For a more comprehensive list of what
works and what doesn't, check out [the documentation page on the current status
of the project](docs/status.md). The interfaces have reached some level of
stability, but might still change in future major releases.

If you have questions or want to contribute, feel free to open issues or pull
requests.

## Documentation

You can find all documentation pages in the [`docs`](docs) directory or browse
through them with these links as entry points:

[The architecture of an application using
h5p-nodejs-library](docs/architecture.md)

[Using h5p-nodejs-library to create your own H5P server](docs/usage.md)

[Helping with the development](docs/development.md)

[Customization options](docs/customization.md)

[Enabling addon support](docs/addons.md)

## Trying out the demo

Make sure you have [`git`](https://git-scm.com/), [`node`](https://nodejs.org/)

> = 10.16, and [`npm`](https://www.npmjs.com/get-npm) installed. If you use
> Windows, you must use bash (comes with Git for windows) as a command shell
> (otherwise scripts won't run).

1. Clone the repository with git
2. `npm install`
3. `npm start`

You can then open the URL http://localhost:8080 in any browser.

## Trying out the demo on Docker

Make sure you have [`git`](https://git-scm.com/) and
[`docker`](https://www.docker.com/) installed.

1. Clone the repository with git
2. `docker build -t <your-username>/h5p-nodejs-library .`
3. `docker run -p 3000:8080 -d <your-username>/h5p-nodejs-library`

You can then open the URL http://localhost:3000 in any browser.

## Contributing

Lumi tries to improve education wherever it is possible by providing a software
that connects teachers with their students. Every help is appreciated and
welcome.

Feel free to create pull requests.

h5p-nodejs-library has adopted the code of conduct defined by the Contributor
Covenant. It can be read in full [here](./CODE-OF-CONDUCT.md).

### Get in touch

[Slack](https://join.slack.com/t/lumi-education/shared_invite/enQtMjY0MTM2NjIwNDU0LWU3YzVhZjdkNGFjZGE1YThjNzBiMmJjY2I2ODk2MzAzNDE3YzI0MmFkOTdmZWZhOTBmY2RjOTc3ZmZmOWMxY2U)
or [c@Lumi.education](mailto:c@Lumi.education).

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/Lumieducation/Lumi/tags).

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE v3 License - see
the [LICENSE](LICENSE) file for details

## Support

This work obtained financial support for development from the German
BMBF-sponsored research project "CARO - Care Reflection Online" (FKN:
01PD15012).

Read more about them at the following websites:

-   CARO - https://blogs.uni-bremen.de/caroprojekt/
-   University of Bremen - https://www.uni-bremen.de/en.html
-   BMBF - https://www.bmbf.de/en/index.html
