# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [8.0.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.2...v8.0.0) (2021-05-07)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.893.0 ([dadb34f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/dadb34fe84f897b5d44cdbc69c5c114bde010532))
* **deps:** update dependency aws-sdk to v2.894.0 ([e501518](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e5015180feaea1f1ae812fc601047f35fccd5c8e))
* **deps:** update dependency aws-sdk to v2.895.0 ([31c3802](https://github.com/Lumieducation/H5P-Nodejs-library/commit/31c3802fe5754bfe5479c2288db78eccf91c7dd9))
* **deps:** update dependency aws-sdk to v2.896.0 ([51a4771](https://github.com/Lumieducation/H5P-Nodejs-library/commit/51a47710bff97cdfcd400899d0fa1665401f78e2))
* **deps:** update dependency aws-sdk to v2.897.0 ([69da95e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/69da95e0f7646bf83b50273511b61eff7b343abd))
* **deps:** update dependency aws-sdk to v2.898.0 ([f51b773](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f51b773c562a6ba8e6a4639ef0469f6697673695))
* **deps:** update dependency aws-sdk to v2.900.0 ([d928a19](https://github.com/Lumieducation/H5P-Nodejs-library/commit/d928a1925aa96c46422abf28366864fbd250573c))
* **deps:** update dependency aws-sdk to v2.902.0 ([b130d63](https://github.com/Lumieducation/H5P-Nodejs-library/commit/b130d63e3c222b355ba4f804bc2aa245b5f3b7c0))
* **deps:** update dependency http-proxy-middleware to v1.3.0 ([8344b6c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/8344b6ce54b2124a55bee6cbfdafa69f80bde107))
* **deps:** update dependency http-proxy-middleware to v1.3.1 ([6acf4c9](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6acf4c9365de5f52fef3961933adc12134f47426))
* **deps:** update dependency i18next to v20.2.2 ([9f62cd6](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9f62cd66831b55432d196ea468235bd722409a02))
* **html-exporter:** lazy loaded JS and CSS files work ([#1362](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1362)) ([450775b](https://github.com/Lumieducation/H5P-Nodejs-library/commit/450775be1a4922ca527863abfff5e4416d3f1381))


### Features

* **h5p-server:** core update ([#1366](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1366)) ([75e1d96](https://github.com/Lumieducation/H5P-Nodejs-library/commit/75e1d96d8415e9485d33f4a690e71311ff7a5a4b))


### BREAKING CHANGES

* **h5p-server:** IH5PConfig type has new configuration values for the H5P Content Hub. Implementions need to extend their implementation accordingly and set default values. H5PAjaxEndpoint.postAjax has a new parameter for the query parameter "hubId". If implementations don't use the h5p-express package, you must change your code accordingly.





## [7.5.2](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.1...v7.5.2) (2021-04-25)


### Bug Fixes

* **deps:** update dependency ajv to v8 ([#1248](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1248)) ([90fcabd](https://github.com/Lumieducation/H5P-Nodejs-library/commit/90fcabda1cb756c4842de54a72095364183974fe))
* **deps:** update dependency ajv-keywords to v5 ([#1252](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1252)) ([91c37ec](https://github.com/Lumieducation/H5P-Nodejs-library/commit/91c37ecdd466b5ec330b1fbbf75ff0c397191ace))
* **deps:** update dependency aws-sdk to v2.878.0 ([301627d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/301627d5a500972db1e6827003fb9dba49222215))
* **deps:** update dependency aws-sdk to v2.879.0 ([4f80dd7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/4f80dd78ebaa69f35bae35a89a0d0c167297a0dc))
* **deps:** update dependency aws-sdk to v2.880.0 ([506f9cc](https://github.com/Lumieducation/H5P-Nodejs-library/commit/506f9ccd9c184ac47b9a3a070bc9a8072ff17bed))
* **deps:** update dependency aws-sdk to v2.881.0 ([cdc871e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/cdc871e87424abc795e855352eef27cb190b342d))
* **deps:** update dependency aws-sdk to v2.882.0 ([ce15907](https://github.com/Lumieducation/H5P-Nodejs-library/commit/ce159079560465c541ec897296db1f95ddb61605))
* **deps:** update dependency aws-sdk to v2.883.0 ([a263120](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a263120e4dd8d2183b5627f7e0757ab851f261eb))
* **deps:** update dependency aws-sdk to v2.884.0 ([acaed7c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/acaed7c82e66fb58c8c9dc86acde4cc148093ccf))
* **deps:** update dependency aws-sdk to v2.885.0 ([b0c2c10](https://github.com/Lumieducation/H5P-Nodejs-library/commit/b0c2c1048be32bf7e5072bd20ef2cf0457aee5d6))
* **deps:** update dependency aws-sdk to v2.886.0 ([a366df4](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a366df4ec42804439b5ad52388bfe3bcb7dbf9d1))
* **deps:** update dependency aws-sdk to v2.887.0 ([56f20a5](https://github.com/Lumieducation/H5P-Nodejs-library/commit/56f20a5c73ac0d5da811c996da0870aa1c4cdead))
* **deps:** update dependency aws-sdk to v2.888.0 ([a42e504](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a42e504198c6d80d2f7a18b6adc18206cca803d5))
* **deps:** update dependency aws-sdk to v2.889.0 ([f3e25c3](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f3e25c3ff01205bf11c1bafae3577b694b7698c4))
* **deps:** update dependency aws-sdk to v2.890.0 ([dc46cf4](https://github.com/Lumieducation/H5P-Nodejs-library/commit/dc46cf42c4deacbf0df82afa8ccdf2138035c7dd))
* **deps:** update dependency aws-sdk to v2.891.0 ([62a035c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/62a035c2c3901e8e918cfaf9975d81d1b6abb84a))
* **deps:** update dependency aws-sdk to v2.892.0 ([432acc0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/432acc09e86729686c0a6d36a85363976eb36f96))
* **deps:** update dependency http-proxy-middleware to v1.1.1 ([6b331bc](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6b331bcab2835d52ff9ed222574a71b19b71bd2b))
* **deps:** update dependency http-proxy-middleware to v1.1.2 ([1c70a7e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/1c70a7e8ff141a7e7b5b247ff1ab95733318a614))
* **deps:** update dependency http-proxy-middleware to v1.2.0 ([3dbea06](https://github.com/Lumieducation/H5P-Nodejs-library/commit/3dbea067d23bfdc83dd9708395f44a9638f663d4))
* **deps:** update dependency http-proxy-middleware to v1.2.1 ([213d416](https://github.com/Lumieducation/H5P-Nodejs-library/commit/213d4161345ff696d110abf28d99c1a7b4e1787a))
* **deps:** update dependency i18next to v20.2.0 ([e8b7935](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e8b79358fe682fda7bb95f0b78a294080995c453))
* **deps:** update dependency i18next to v20.2.1 ([01bb61d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/01bb61db1427437ce3c654ee418519c758c1ece3))
* **deps:** update dependency i18next-http-middleware to v3.1.1 ([da158c5](https://github.com/Lumieducation/H5P-Nodejs-library/commit/da158c5b2df662cf129604caca682ae89288a481))
* **deps:** update dependency image-size to v1 ([#1300](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1300)) ([9c96e70](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9c96e703ab3a28b363c7858a3ddebf520e1773a4))
* **deps:** update dependency mongodb to v3.6.6 ([bcf8d1d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/bcf8d1d00a5eb3b76f48ee393ab919c8a9b133ed))
* **h5p-server:** accepts library directories that look like files ([#1331](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1331)) ([5ec660c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5ec660c2288e495967a47aaa4e9477e09d0f83d3)), closes [#1317](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1317)
* **h5p-server:** file format filter now case insensitive ([#1313](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1313)) ([0bbf7bc](https://github.com/Lumieducation/H5P-Nodejs-library/commit/0bbf7bc0cd7293713971636ef06e86e73d7144a5)), closes [#1299](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1299)
* **h5p-server:** library list works if library dependencies are missing ([#1342](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1342)) ([6dab877](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6dab87701327f966f95dc88a020e26979beb340b)), closes [#1183](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1183)
* **h5p-server:** package validator accepts dots in library file paths ([#1341](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1341)) ([e5ac643](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e5ac6432df5e9cc5dec0755e71fb0d6eb247db0e)), closes [#1339](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1339)
* **h5p-webcomponent:** h5p integration object performs deep merge  ([#1340](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1340)) ([841c360](https://github.com/Lumieducation/H5P-Nodejs-library/commit/841c360599998a52032eef073fa2d4c3bf148dba)), closes [#1296](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1296)





## [7.5.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.5.0...v7.5.1) (2021-04-01)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.875.0 ([7a4360f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7a4360fc0dac7a77fb0d908b05e418674f20e81b))
* **deps:** update dependency aws-sdk to v2.876.0 ([91c9db7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/91c9db7b36b999bceabaa338e4cf563c83615db3))
* **deps:** update dependency aws-sdk to v2.877.0 ([db3063d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/db3063d4bd5f0cac836471938b310cd9d45487e7))
* **deps:** update dependency cache-manager to v3.4.2 ([0e84c95](https://github.com/Lumieducation/H5P-Nodejs-library/commit/0e84c95c88fcd063c2bb180e3e2421a8534bbaae))
* **deps:** update dependency cache-manager to v3.4.3 ([3321b47](https://github.com/Lumieducation/H5P-Nodejs-library/commit/3321b47c04a8ef3c43b4976da8ceae4f8f2cde56))
* **deps:** update dependency http-proxy-middleware to v1.1.0 ([ae286f8](https://github.com/Lumieducation/H5P-Nodejs-library/commit/ae286f830ab0ef9e80457bb84b7c8bc75f9f6040))
* **deps:** update dependency i18next-fs-backend to v1.1.1 ([308d2e3](https://github.com/Lumieducation/H5P-Nodejs-library/commit/308d2e3faa9f93583d7b2f634ee5c97e45df9586))
* **h5p-server:** stricter file upload validation ([#1268](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1268)) ([8e8df77](https://github.com/Lumieducation/H5P-Nodejs-library/commit/8e8df7791d9bec953514ee05dd9ae2c6ac5de4cb))





# [7.5.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.3.1...v7.5.0) (2021-03-27)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.864.0 ([25a41a4](https://github.com/Lumieducation/H5P-Nodejs-library/commit/25a41a46cc2a9249285f9db3bfeed84982a51b78))
* **deps:** update dependency aws-sdk to v2.865.0 ([f6cc040](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f6cc040f6aa05b3c9c1d879c50fd325da2f07d3d))
* **deps:** update dependency aws-sdk to v2.866.0 ([05316ad](https://github.com/Lumieducation/H5P-Nodejs-library/commit/05316ad80daa550c6d2dfbb772e54da6d5f8847c))
* **deps:** update dependency aws-sdk to v2.867.0 ([aa2ee01](https://github.com/Lumieducation/H5P-Nodejs-library/commit/aa2ee0123349a695251a49a91448019cc31122ba))
* **deps:** update dependency aws-sdk to v2.868.0 ([6e858d0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6e858d04ebc74db43e724c18f321f4fe4a224078))
* **deps:** update dependency aws-sdk to v2.869.0 ([e0214ff](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e0214ff15b6f761248c791f8b9e917bfd7bfab03))
* **deps:** update dependency aws-sdk to v2.870.0 ([5929c17](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5929c179092974304ee6fb5d9fec114ab8271eff))
* **deps:** update dependency aws-sdk to v2.871.0 ([1f5fdae](https://github.com/Lumieducation/H5P-Nodejs-library/commit/1f5fdae7b7fe4123b53e925670df2a9b005482eb))
* **deps:** update dependency aws-sdk to v2.873.0 ([#1239](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1239)) ([5f3e2ee](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5f3e2eedc1cfe2135c9cdcceb4ecf2c899db1eb3))
* **deps:** update dependency aws-sdk to v2.874.0 ([f2f476c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f2f476c2b025b160931eb6493dba399788e6fc6f))
* **deps:** update dependency i18next to v20 ([#1215](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1215)) ([5f6dd7d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5f6dd7df2dbf00d26f60a18e89156eb207c66b74))
* **deps:** update dependency i18next to v20.1.0 ([85c7b0b](https://github.com/Lumieducation/H5P-Nodejs-library/commit/85c7b0ba8985f315c99f6efdb76dbb74709b19e6))
* **deps:** update dependency mongodb to v3.6.5 ([691cabc](https://github.com/Lumieducation/H5P-Nodejs-library/commit/691cabcb6f06370a90efbf5e9660520acc917bba))
* **deps:** update font awesome ([56808d5](https://github.com/Lumieducation/H5P-Nodejs-library/commit/56808d59c5143627de5faca8f179a25ed8c61994))
* **deps:** update react monorepo to v17.0.2 ([333a447](https://github.com/Lumieducation/H5P-Nodejs-library/commit/333a447caf0ecb2dbee9ecd9116afd7b7064d56c))
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


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.864.0 ([cec9d82](https://github.com/Lumieducation/H5P-Nodejs-library/commit/cec9d82985f246b7b649b5bcb598eedfcae45406))
* **deps:** update dependency aws-sdk to v2.865.0 ([ad16870](https://github.com/Lumieducation/H5P-Nodejs-library/commit/ad168703d8ee7cfb0ff305be9066c740bd205364))
* **deps:** update dependency aws-sdk to v2.866.0 ([e1f021d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e1f021dc5bdccc77b0cffbbf38f26f23fdf200d9))
* **deps:** update dependency aws-sdk to v2.867.0 ([7101840](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7101840cd978ee3804f9ecd8f727f600a81a7aac))
* **deps:** update dependency aws-sdk to v2.868.0 ([496221d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/496221d11172c15ee96c070ef857f0f8673844ce))
* **deps:** update dependency mongodb to v3.6.5 ([afd3f40](https://github.com/Lumieducation/H5P-Nodejs-library/commit/afd3f40b934a36d3636fef3594e9bef362a52219))
* **deps:** update font awesome ([d956d81](https://github.com/Lumieducation/H5P-Nodejs-library/commit/d956d81070b23dd36cb29f3817151a54f19df488))


### Features

* **h5p-server:** hub now localizable ([#1200](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1200)) ([494aaef](https://github.com/Lumieducation/H5P-Nodejs-library/commit/494aaef1e57763c5d5ad89868349f523207573a1))
* **h5p-server:** localization of library names ([#1205](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1205)) ([dfbb892](https://github.com/Lumieducation/H5P-Nodejs-library/commit/dfbb89298688a4b7f9a1f6eae82dc52179d1c7b8))





## [7.3.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.3.0...v7.3.1) (2021-03-14)


### Bug Fixes

* **h5p-server:** fixed url generation for absolulte library files ([#1180](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1180)) ([2014332](https://github.com/Lumieducation/H5P-Nodejs-library/commit/20143326a9c0fbf17c6505a7687f332b120170c6))





# [7.3.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.2.0...v7.3.0) (2021-03-14)


### Bug Fixes

* **deps:** pin dependencies ([e1420f6](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e1420f6c63cb4a667d5ce53409392164cc4b7c54))
* **deps:** update dependency @testing-library/user-event to v12.8.0 ([dda5e8c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/dda5e8cd1ea054c392ae957d05e2caae5851a82f))
* **deps:** update dependency @testing-library/user-event to v12.8.1 ([05144b0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/05144b0b55e7d61e89af849e51bd06ea7c41c31d))
* **deps:** update dependency aws-sdk to v2.852.0 ([5efe810](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5efe810ec07deca9e5502f021f9fe0cda1d135e5))
* **deps:** update dependency aws-sdk to v2.853.0 ([a6c0096](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a6c0096ef8a6c10e5b6c17a38f08fbd060962fd2))
* **deps:** update dependency aws-sdk to v2.854.0 ([47067ba](https://github.com/Lumieducation/H5P-Nodejs-library/commit/47067badc4b7c341caa8b5978cfabf1f54aacef6))
* **deps:** update dependency aws-sdk to v2.855.0 ([e0ff15d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e0ff15d8f90d1e714c2090d2dd1a36a2fa11756b))
* **deps:** update dependency aws-sdk to v2.856.0 ([21abf87](https://github.com/Lumieducation/H5P-Nodejs-library/commit/21abf87e75b633f567c4bb6a8c861fb1ed15d8ab))
* **deps:** update dependency aws-sdk to v2.857.0 ([621a53f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/621a53f0c15e186fb2ca64bbd59c4e0b0327d6b3))
* **deps:** update dependency aws-sdk to v2.858.0 ([52aec33](https://github.com/Lumieducation/H5P-Nodejs-library/commit/52aec339824b514cd4944c52df4a503a580262b6))
* **deps:** update dependency aws-sdk to v2.859.0 ([71393dd](https://github.com/Lumieducation/H5P-Nodejs-library/commit/71393dd2d784527d074cc3b55c69f7d70013edd1))
* **deps:** update dependency aws-sdk to v2.860.0 ([92bde6c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/92bde6c14634729eef6f9333db037f52f63cdd5c))
* **deps:** update dependency aws-sdk to v2.861.0 ([75748b0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/75748b0e8d8db757fd132578ae40192857080184))
* **deps:** update dependency aws-sdk to v2.862.0 ([aafe36c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/aafe36c6a21c78ff5334fae5448995a26241adba))
* **deps:** update dependency aws-sdk to v2.863.0 ([04baa97](https://github.com/Lumieducation/H5P-Nodejs-library/commit/04baa9702051fbf9c24cecd5ffea9a57aca2ba47))
* **deps:** update dependency cache-manager to v3.4.1 ([07ede73](https://github.com/Lumieducation/H5P-Nodejs-library/commit/07ede73933209f0c17eb5b5bebb3d182828df903))
* **deps:** update dependency i18next to v19.9.2 ([2f4379c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/2f4379c83a196f6eecc1edcbcaf1f23452ee33d8))
* **deps:** update dependency i18next-http-middleware to v3.1.0 ([c729354](https://github.com/Lumieducation/H5P-Nodejs-library/commit/c729354271808d01665582220d613fc400411812))
* **deps:** update dependency react-bootstrap to v1.5.1 ([969ad52](https://github.com/Lumieducation/H5P-Nodejs-library/commit/969ad527ff5ddc0da97994eb4db469288a1ceb8b))
* **deps:** update dependency react-bootstrap to v1.5.2 ([5f8aca3](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5f8aca3cd7169a4ee1c07b626f2bf44bbb0b160e))
* **deps:** update dependency typescript to v4.2.2 ([5062806](https://github.com/Lumieducation/H5P-Nodejs-library/commit/506280685b02ee47d948e7de5e6c8a77d6855698))
* **deps:** update dependency typescript to v4.2.3 ([1424804](https://github.com/Lumieducation/H5P-Nodejs-library/commit/142480416763e34d79626a605032c8fa11f8f76c))
* **h5p-server:** now exports UrlGenerator ([#1120](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1120)) ([23822ff](https://github.com/Lumieducation/H5P-Nodejs-library/commit/23822ffe133371a72362305a9ae02ac72ed692b1))


### Features

* **h5p-mongos3:** new MongoLibraryStorage class ([#1118](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1118)) ([050360f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/050360f7411339959624d35793373e6f4503ddb9))





# [7.2.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.1.0...v7.2.0) (2021-03-04)


### Bug Fixes

* **deps:** pin dependencies ([f01d554](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f01d554143cbbf2c5ed832ca2f360cd8cf2324be))
* **deps:** update dependency @testing-library/user-event to v12.8.0 ([50015a7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/50015a7b2144588f282a3a3e533613d6c738b64e))
* **deps:** update dependency @testing-library/user-event to v12.8.1 ([43a9121](https://github.com/Lumieducation/H5P-Nodejs-library/commit/43a9121ab59c9b4112614557a4d99df94fe91eb8))
* **deps:** update dependency aws-sdk to v2.852.0 ([fa54d6d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/fa54d6d47881457ef77372d2ca7c24946c000c3a))
* **deps:** update dependency aws-sdk to v2.853.0 ([f5f93a8](https://github.com/Lumieducation/H5P-Nodejs-library/commit/f5f93a891fb8f81c4a84fcdae86b0d71de36cd3f))
* **deps:** update dependency aws-sdk to v2.854.0 ([6a0d29c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6a0d29cb35097328f582f98a82245ac8d5a39fdd))
* **deps:** update dependency aws-sdk to v2.855.0 ([b1b75f0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/b1b75f09cf423380c4dcda98f2694c8480221897))
* **deps:** update dependency aws-sdk to v2.856.0 ([10b9278](https://github.com/Lumieducation/H5P-Nodejs-library/commit/10b9278380ea8df5a5aa5cb5fb2aa28e81c9bf94))
* **deps:** update dependency react-bootstrap to v1.5.1 ([37cfb4b](https://github.com/Lumieducation/H5P-Nodejs-library/commit/37cfb4b4df34ebd307f728113030030d34ccf6c4))
* **deps:** update dependency typescript to v4.2.2 ([87f414c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/87f414ca2a332ac9fb84f697ce8b4dce842e8ca2))
* **h5p-server:** now exports UrlGenerator ([#1120](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1120)) ([fa059a8](https://github.com/Lumieducation/H5P-Nodejs-library/commit/fa059a82d4ea5fcded674d1250c85dbd66796d22))


### Features

* **h5p-mongos3:** new MongoLibraryStorage class ([#1118](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1118)) ([9527dfd](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9527dfd70701c924a4dbfa2bc4bb7c4949df4da0))





# [7.1.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v6.2.0...v7.1.0) (2021-02-25)


### Bug Fixes

* **deps:** pin dependencies ([e347be7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/e347be775deddb052b635b5d7c31bc4f26f3983c))
* **deps:** update dependency @testing-library/user-event to v12.7.3 ([77d09e1](https://github.com/Lumieducation/H5P-Nodejs-library/commit/77d09e153a4ccf556ba4e14c6eb6956d917cd89b))
* **deps:** update dependency @types/node to v14.14.31 ([c69809d](https://github.com/Lumieducation/H5P-Nodejs-library/commit/c69809d980b2c1c57753567f8ed7d6bd9c7e8964))
* **deps:** update dependency aws-sdk to v2.845.0 ([7688aea](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7688aea73f56c4f7ade36596e02b341f71badeec))
* **deps:** update dependency aws-sdk to v2.846.0 ([6e3da4e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6e3da4e18360884f06bdcdf549ee9ca8d41b9c0a))
* **deps:** update dependency aws-sdk to v2.847.0 ([7c94374](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7c9437427fba07d0e8e8948d01e7533ba83661e2))
* **deps:** update dependency aws-sdk to v2.848.0 ([4efb512](https://github.com/Lumieducation/H5P-Nodejs-library/commit/4efb512e1d3c80917c6593495a966c73e7c72acf))
* **deps:** update dependency aws-sdk to v2.849.0 ([7c27bd3](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7c27bd3c83fdf0e87aca2b2d909ae97629199661))
* **deps:** update dependency aws-sdk to v2.850.0 ([53293e6](https://github.com/Lumieducation/H5P-Nodejs-library/commit/53293e6ce690a432c61e5051bf90df7f8869b117))
* **deps:** update dependency aws-sdk to v2.851.0 ([48118a0](https://github.com/Lumieducation/H5P-Nodejs-library/commit/48118a025d3439ea129a13a7e67e767bc5cb307f))
* **deps:** update dependency i18next to v19.9.0 ([4e76e6c](https://github.com/Lumieducation/H5P-Nodejs-library/commit/4e76e6cde068bc2eb8ffb129ba22babb676fc222))
* **deps:** update dependency mongodb to v3.6.4 ([#1056](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1056)) ([412c00a](https://github.com/Lumieducation/H5P-Nodejs-library/commit/412c00ad37d4b48cc0a58ee17d43f0bf42f07344))
* **deps:** update dependency react to v16.14.0 ([#1057](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1057)) ([09cec79](https://github.com/Lumieducation/H5P-Nodejs-library/commit/09cec79d2e575ed38c9dec284cefd5003306d04f))
* **deps:** update dependency react to v17 ([#1059](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1059)) ([a4a73be](https://github.com/Lumieducation/H5P-Nodejs-library/commit/a4a73be05660915a0be1178d3533bbd61d45d0e9))
* **deps:** update dependency react-scripts to v4.0.3 ([2a73f75](https://github.com/Lumieducation/H5P-Nodejs-library/commit/2a73f75b897c51bebe3c7462b19f899d7b7be8a1))
* **h5p-mongos3:** fixed default export ([#1070](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1070)) ([b25dbaa](https://github.com/Lumieducation/H5P-Nodejs-library/commit/b25dbaaaf4db02cca59fd8dc4330f86d52b96708)), closes [#1069](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1069)
* **h5p-server:** missing translations when language was not found ([#1063](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1063)) ([5bc9976](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5bc9976928cdba441f32c4392b2dfe3642b95abc))


### Features

* **h5p-mongos3:** new mongo-s3 library storage class ([#1062](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1062)) ([9fc3da7](https://github.com/Lumieducation/H5P-Nodejs-library/commit/9fc3da734f5e98dca8fbbf4879f60118b16fb415))
* **h5p-react:** added xAPI collector to player ([5802e6f](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5802e6fa287c743a7be638f06404d13f5444dd19))


### Reverts

* Revert "GitBook: [master] 25 pages and 6 assets modified" ([4ec700b](https://github.com/Lumieducation/H5P-Nodejs-library/commit/4ec700bf4dfeeec0894add192d533bcd4dc1ebf0))





## [7.0.2](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.0.1...v7.0.2) (2021-02-18)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.846.0 ([6e3da4e](https://github.com/Lumieducation/H5P-Nodejs-library/commit/6e3da4e18360884f06bdcdf549ee9ca8d41b9c0a))





## [7.0.1](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v7.0.0...v7.0.1) (2021-02-18)

**Note:** Version bump only for package @lumieducation/h5p-monorepo





# [7.0.0](https://github.com/Lumieducation/H5P-Nodejs-library/compare/v6.2.0...v7.0.0) (2021-02-18)


### Bug Fixes

* **deps:** update dependency aws-sdk to v2.845.0 ([7688aea](https://github.com/Lumieducation/H5P-Nodejs-library/commit/7688aea73f56c4f7ade36596e02b341f71badeec))
* **deps:** update dependency mongodb to v3.6.4 ([#1056](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1056)) ([412c00a](https://github.com/Lumieducation/H5P-Nodejs-library/commit/412c00ad37d4b48cc0a58ee17d43f0bf42f07344))
* **deps:** update dependency react to v16.14.0 ([#1057](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1057)) ([09cec79](https://github.com/Lumieducation/H5P-Nodejs-library/commit/09cec79d2e575ed38c9dec284cefd5003306d04f))
* **h5p-server:** missing translations when language was not found ([#1063](https://github.com/Lumieducation/H5P-Nodejs-library/issues/1063)) ([5bc9976](https://github.com/Lumieducation/H5P-Nodejs-library/commit/5bc9976928cdba441f32c4392b2dfe3642b95abc))
