# Plan of manual tests before releases

## General

- [ ] Check CI pipeline test
- [ ] Run automatic tests on local machine:
  - [ ] test:h5p-redis-lock (requires redis)
  - [ ] test:h5p-shared-state-server

## Test Setup for tests

- [ ] Server-side rendering

### Permutations of storage

- [ ] File system storages (default)
- [ ] MongoDB + S3 Storage + Redis Cache (rename mongo+s3+redis.env file in packages/h5p-examples to .env)
- [ ] Pure MongoDB storage without cache (rename mongo+mongos3.env file in packages/h5p-examples to .env)

## Tests: Library management

- [ ] Reset library storage & cache
- [ ] Download library cache file from UI
- [ ] Download some content types from Hub
- [ ] Delete content types in GUI
- [ ] Reset library storage
- [ ] Download Blanks and Course Presentation from Hub.
- [ ] Manually upload MathJax addon through library upload (https://h5p.org/mathematical-expressions)

## Tests: Content

Do all of the following for Blanks and Course Presentation (with 2 subtypes):

- [ ] Check browser console for errors while doing tests.
- [ ] Create
  - [ ] set metadata
  - [ ] upload image
  - [ ] minimal content
- [ ] Display content
- [ ] Use copy & paste to create new content
- [ ] Download and upload again
- [ ] Load downloaded content in Lumi and try out
- [ ] Upload downloaded content in WordPress instance and try out (use the docker-compose in scripts)
- [ ] Download HTML export
- [ ] Check HTML export in Chrome, Firefox, Safari Desktop and Mobile Safari
- [ ] Edit content, save and display
- [ ] Delete content

## Tests: Content Hub

- [ ] Search content hub
- [ ] Browse content hub
- [ ] Download 2 different types of content

## Mongo / S3 / Redis storage

## Rest example

- [ ] run REST example & React frontend

## Tests: Localization

- [ ] Switch languages in REST server and check ...
  - [ ] H5P Hub content type names and descriptions 
  - [ ] content metadata field names
  - [ ] editor fields
  - [ ] modal labels in editor
  - [ ] modal labels in player
  - [ ] Server messages (upload invalid h5p package)
- [ ] server-side rendering
  - [ ] "Reuse" buttons in player
