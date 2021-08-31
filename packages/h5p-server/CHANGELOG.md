# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [8.1.6](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.5...v8.1.6) (2021-08-18)


### Bug Fixes

* **h5p-server:** local dir paths with certain unicode characters work ([#1680](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1680)) ([5e07048](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5e070485a8433e0336f9f7e574ab7fb18a95cf2d))





## [8.1.5](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.4...v8.1.5) (2021-08-18)

**Note:** Version bump only for package @lumieducation/h5p-server





## [8.1.4](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.3...v8.1.4) (2021-07-22)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.945.0 ([5708677](https://github.com/Lumieducation/H5P-Nodejs-library/commit/570867763538590c6102071115499634447d75cf))





## [8.1.3](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.2...v8.1.3) (2021-07-13)

**Note:** Version bump only for package @lumieducation/h5p-server





## [8.1.2](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.1...v8.1.2) (2021-07-11)

**Note:** Version bump only for package @lumieducation/h5p-server





## [8.1.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.1.0...v8.1.1) (2021-07-08)


### Bug Fixes

* **h5p-server:** content type cache always shows most recent version ([#1571](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1571)) ([6bab3df](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6bab3df81cee79375cd046a0829a93a80b72ad41))





# [8.1.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.0.1...v8.1.0) (2021-06-05)


### Bug Fixes

* **h5p-server:** retrieve metadataSettings from library.json ([3de270e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/3de270edc57c02256f0992b4f2f9c7c429333fc0))


### Features

* **h5p-server:** added forward proxy support ([#1414](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1414)) ([af18af1](https://github.com/Lumieducation/H5P-Nodejs-library/commit/af18af1f9113aae4ecb1b84ceaa3693a7ebfa235))





## [8.0.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v8.0.0...v8.0.1) (2021-05-11)

**Note:** Version bump only for package @lumieducation/h5p-server





# [8.0.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.2...v8.0.0) (2021-05-07)


### Bug Fixes

* **deps:** update dependency http-proxy-middleware to v1.3.0 ([8344b6c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/8344b6ce54b2124a55bee6cbfdafa69f80bde107))


### Features

* **h5p-server:** core update ([#1366](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1366)) ([75e1d96](https://github.com/Lumieducation/H5P-Nodejs-library/commit/75e1d96d8415e9485d33f4a690e71311ff7a5a4b))


### BREAKING CHANGES

* **h5p-server:** IH5PConfig type has new configuration values for the H5P Content Hub. Implementions need to extend their implementation accordingly and set default values. H5PAjaxEndpoint.postAjax has a new parameter for the query parameter "hubId". If implementations don't use the h5p-express package, you must change your code accordingly.





## [7.5.2](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.1...v7.5.2) (2021-04-25)


### Bug Fixes

* **deps:** update dependency ajv to v8 ([#1248](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1248)) ([90fcabd](https://github.com/Lumieducation/H5P-Nodejs-library/commit/90fcabda1cb756c4842de54a72095364183974fe))
* **deps:** update dependency ajv-keywords to v5 ([#1252](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1252)) ([91c37ec](https://github.com/Lumieducation/H5P-Nodejs-library/commit/91c37ecdd466b5ec330b1fbbf75ff0c397191ace))
* **deps:** update dependency image-size to v1 ([#1300](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1300)) ([9c96e70](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9c96e703ab3a28b363c7858a3ddebf520e1773a4))
* **h5p-server:** accepts library directories that look like files ([#1331](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1331)) ([5ec660c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5ec660c2288e495967a47aaa4e9477e09d0f83d3)), closes [#1317](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1317)
* **h5p-server:** file format filter now case insensitive ([#1313](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1313)) ([0bbf7bc](https://github.com/Lumieducation/H5P-Nodejs-library/commit/0bbf7bc0cd7293713971636ef06e86e73d7144a5)), closes [#1299](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1299)
* **h5p-server:** library list works if library dependencies are missing ([#1342](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1342)) ([6dab877](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6dab87701327f966f95dc88a020e26979beb340b)), closes [#1183](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1183)
* **h5p-server:** package validator accepts dots in library file paths ([#1341](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1341)) ([e5ac643](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e5ac6432df5e9cc5dec0755e71fb0d6eb247db0e)), closes [#1339](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1339)





## [7.5.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.0...v7.5.1) (2021-04-01)


### Bug Fixes

* **h5p-server:** stricter file upload validation ([#1268](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1268)) ([8e8df77](https://github.com/Lumieducation/H5P-Nodejs-library/commit/8e8df7791d9bec953514ee05dd9ae2c6ac5de4cb))





# [7.5.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.3.1...v7.5.0) (2021-03-27)


### Bug Fixes

* **h5p-server:** added / updated Spanish locales ([41b7ab4](https://github.com/Lumieducation/H5P-Nodejs-library/commit/41b7ab427ee4f278732efacd245ffdc04953997f))
* **h5p-server:** added auto-translated locales ([#1231](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1231)) ([9660bbf](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9660bbfed4e71b6909717486c74586c7ccd5592e))
* **h5p-server:** added Spanish (int) + Spanish (Mex) translations ([a2d51bd](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a2d51bd0986eedfc9f8e28e429891a65300eb65f))
* **h5p-server:** added Spanish locales ([87e7fa9](https://github.com/Lumieducation/H5P-Nodejs-library/commit/87e7fa924a7cc7d6fd7605830d5c5b69d7d90095))
* **h5p-server:** corrected auto-translated locales ([aec92f7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/aec92f7b57ac73e071f128a154be1742d8d68ff9))
* **h5p-server:** Updated Spanish locales ([5251b93](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5251b937b301e2752de8bae311a31949dd3a3f77))


### Features

* **h5p-server:** hub now localizable ([#1200](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1200)) ([2d8505c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/2d8505c55cf0c3bc95a60103f73d973cf92837cb))
* **h5p-server:** localization of library names ([#1205](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1205)) ([977ec84](https://github.com/Lumieducation/H5P-Nodejs-library/commit/977ec844ee64f4c8f9af037e1f0bcd97ff84e42d))





# [7.4.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.3.1...v7.4.0) (2021-03-21)


### Features

* **h5p-server:** hub now localizable ([#1200](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1200)) ([494aaef](https://github.com/Lumieducation/H5P-Nodejs-library/commit/494aaef1e57763c5d5ad89868349f523207573a1))
* **h5p-server:** localization of library names ([#1205](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1205)) ([dfbb892](https://github.com/Lumieducation/H5P-Nodejs-library/commit/dfbb89298688a4b7f9a1f6eae82dc52179d1c7b8))





## [7.3.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.3.0...v7.3.1) (2021-03-14)


### Bug Fixes

* **h5p-server:** fixed url generation for absolulte library files ([#1180](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1180)) ([2014332](https://github.com/Lumieducation/H5P-Nodejs-library/commit/20143326a9c0fbf17c6505a7687f332b120170c6))





# [7.3.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.2.0...v7.3.0) (2021-03-14)


### Bug Fixes

* **h5p-server:** now exports UrlGenerator ([#1120](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1120)) ([23822ff](https://github.com/Lumieducation/H5P-Nodejs-library/commit/23822ffe133371a72362305a9ae02ac72ed692b1))





# [7.2.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.1.0...v7.2.0) (2021-03-04)


### Bug Fixes

* **h5p-server:** now exports UrlGenerator ([#1120](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1120)) ([fa059a8](https://github.com/Lumieducation/H5P-Nodejs-library/commit/fa059a82d4ea5fcded674d1250c85dbd66796d22))





# [7.1.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v6.2.0...v7.1.0) (2021-02-25)


### Bug Fixes

* **h5p-server:** missing translations when language was not found ([#1063](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1063)) ([5bc9976](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5bc9976928cdba441f32c4392b2dfe3642b95abc))


### Features

* **h5p-mongos3:** new mongo-s3 library storage class ([#1062](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1062)) ([9fc3da7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9fc3da734f5e98dca8fbbf4879f60118b16fb415))
* **h5p-react:** added xAPI collector to player ([5802e6f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5802e6fa287c743a7be638f06404d13f5444dd19))





## [7.0.2](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.0.1...v7.0.2) (2021-02-18)

**Note:** Version bump only for package @lumieducation/h5p-server





## [7.0.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.0.0...v7.0.1) (2021-02-18)

**Note:** Version bump only for package @lumieducation/h5p-server





# [7.0.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v6.2.0...v7.0.0) (2021-02-18)


### Bug Fixes

* **h5p-server:** missing translations when language was not found ([#1063](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1063)) ([5bc9976](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5bc9976928cdba441f32c4392b2dfe3642b95abc))
