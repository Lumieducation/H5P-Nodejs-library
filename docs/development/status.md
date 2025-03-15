---
title: Project status
group: Documents
category: Contributing
---

# Status of h5p-nodejs-library

The library is at a stage in which the major functionality of the H5P editor and
player are working. You can check in the lists below, what is already
implemented and what isn't.

## Finished functionality

* ✅ store and serve libraries / content types
* ✅ store and serve content
  * ✅ create, read, update and delete operations on content
  * ✅ manage file uploads (= images, video etc.) in temporary files
  * ✅ decoupling of storage through interfaces
* ✅ provide AJAX endpoints for the editor and player
* ✅ backend communication with the H5P Hub
  * ✅ register the site
  * ✅ send usage statistics
  * ✅ get information about content types on the hub
  * ✅ download and install new content types / updates of content types on
    user request
* ✅ validation of packages (structural integrity and conformity of content and
  libraries)
* ✅ offers downloads for h5p packages ("exporting" content)
* ✅ support for copy & paste in the editor
* ✅ support for editor interface languages other than English
* ✅ addons (required to display mathematical formulas)
* ✅ MongoDB and S3 storage implementation for content and temporary files
* ✅ library administration endpoint and React UI component
* ✅ check permissions of users (install libraries, download h5p package, embed
  h5p package, create restricted, update libraries, install recommended, copy
  h5p?)
* ✅ MongoDB and S3 storage implementation for libraries
* ✅ Redis cache for caching
* ✅ catch and relay xAPI statements
* ✅ alter library files, semantics (allows site admins to change libraries
  without hacking the actual files; very useful) (published soon)
* ✅ filter html to prevent cross-site-scripting (XSS) vulnerabilities.
* ✅ add csrf tokens to AJAX POST requests
* ✅ storing user state in the player (for continuing later where the user left
  off)

## Unfinished functionality

* ❌ validation of content against full library semantics (currently only text
  is validated)
* ❌ logging & statistics generation: e.g. use of libraries by author, view of
  embedded content etc. (see h5p-php-library:h5p-event-base.class.php for a list
  of events)
* ❌ provide embed route for content [embed links can be generated but no route
  yet]
* ❌ bundle and cache assets (aggregates all css and js files into two big
  files to decrease http requests; done in
  h5p-php-library:h5p-default-storage.class.php-&gt;cacheAssets(...))
* ❌ logging and statistics (there is a debug logger, but not one that allows
  you to log domain events)
* ❌ mass content updates (possibly funded in the future)
* ❌ option to disable H5P Hub
* ❌ performance optimizations
