# Status of h5p-nodejs-library

The library is at a stage in which the major functionality of the H5P editor
and player are working. You can check in the lists below, what is already
implemented and what isn't.

## Finished functionality

-   [x] store and serve libraries / content types
-   [x] store and serve content
    -   [x] create, read, update and delete operations on content
    -   [x] manage file uploads (= images, video etc.) in temporary files
    -   [x] decoupling of storage through interfaces
-   [x] provide AJAX endpoints for the editor and player
-   [x] backend communication with the H5P Hub
    -   [x] register the site
    -   [x] send usage statistics
    -   [x] get information about content types on the hub
    -   [x] download and install new content types / updates of content types on user request
-   [x] validation of packages (structural integrity and conformity of content and libraries)
-   [x] offers downloads for h5p packages ("exporting" content)
-   [x] support for copy & paste in the editor
-   [x] support for editor interface languages other than English
-   [x] addons (required to display mathematical formulas)
-   [x] MongoDB and S3 storage implementation for content and temporary files
-   [x] library administration endpoint and React UI component

## Unfinished functionality

-   [ ] storing user state in the player (for continuing later where the user left off)
-   [ ] validation of content against library semantics (+ filter html to prevent cross-site-scripting (XSS) vulnerabilities.)
-   [ ] manage and check editor tokens (to make sure you have access rights to a session) (might never be implemented, as this is something the implementation should check)
-   [ ] logging & statistics generation: e.g. use of libraries by author, view of embedded content etc. (see h5p-php-library:h5p-event-base.class.php for a list of events)
-   [x] alter library files, semantics (allows site admins to change libraries without hacking the actual files; very useful) (published soon)
-   [ ] provide embed option for content (as div and as iframe)
-   [ ] (**only partly supported**) check permissions of users (install libraries, download h5p package, embed h5p package, create restricted, update libraries, install recommended, copy h5p?)
-   [ ] cache assets (aggregates all css and js files into two big files to decrease http requests; done in h5p-php-library:h5p-default-storage.class.php->cacheAssets(...))
-   [ ] logging and statistics (there is a debug logger, but not one that allows you to log domain events)
-   [ ] mass content updates
-   [ ] catch and relay xAPI statements
-   [ ] option to disable H5P Hub
-   [ ] security review
-   [ ] performance optimizations
-   [ ] MongoDB and S3 storage implementation for libraries
-   [x] Redis cache for caching (published soon)
