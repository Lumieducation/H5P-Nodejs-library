# Privacy when using h5p-nodejs-library as part of your application

You can use the following information to make sure you comply with your local
regulations (e.g. GDPR). You can base your privacy declaration on parts of it.

**Note that this list was compiled to the best knowledge of the contributor,
but that the contributor cannot provide a legal guarantee that the information
is correct. In particular there might have been changes to the code after this
list was created and these changes might not be reflected in this document. In
doubt you should consult the source code yourself and make sure the information
provided here is correct!**

_Last update of this document: 28th June 2020_

## Stored personal data

The library itself does not store personal data as such. For example it keeps
no user directory.

## Processed personal data

The implementation passes some personal data to h5p-nodejs-library for H5P to
work properly. This data is used in several places by the system and might also
be visible to the user (and in the future: other users).

-   the user's id
-   the real name of the user (full name)
-   the language used by user
-   rights and permissions of the user (in general and relating to content)

## Usage-based personal data

When the user does certain actions in the system, the following data is
stored (if the user chooses to do so):

-   h5p content objects
    -   includes all personal data entered by the user as metadata
        (e.g. revision history, description, etc.)
    -   includes user id of creator
    -   includes creation date and time
    -   (if applicable) includes media contained in it
-   uploaded resources (images, videos etc.)
    -   includes user id of the user who uploaded the file
    -   includes upload date and time

### Retention times

-   h5p content objects: kept until explicitly deleted by the implementation
-   uploaded resources:
    -   kept until corresponding h5p content object is deleted
    -   temporary files (used in the editor) are automatically deleted after the
        time set in `temporaryFileLifetime` in IH5PConfig (defaults to 120 min);
        **If you use the S3 storage backend, you have to configure automatic
        deletion of temporary files yourself!**

### Logging

At the moment, the library does not include a component that logs user
actions at the domain level. However, if you start the library in debug mode,
it emits a log which might contain personal information (all of the data
mentioned in the sections above). It is not recommended to turn on debugging
in a production environment that processes real user data.

### Communication with 3rd party Internet servers

The h5p-nodejs-library **server** communicates with the official H5P Hub at h5p.org
to retrieve the current list of available content types and to download new or
updated content types from the H5P Hub. When first contacting the H5P Hub, the
h5p-nodejs-library requests the creation of a unique id **for the server**,
which is then transmitted to the H5P Hub on every content type list update. It
also transmits the following information about your server:

-   the IP address of the server
-   the supported core API version of H5P
-   the version of the PHP implementation the server imitates
-   a local id of the server (a hash value of the path of the server files)
-   that the server runs on h5p-nodejs-library and with which version
-   whether the site is a localhost, in a private network or accessible in the
    Internet (configured by you in the IH5PConfig)

When using the H5P Editor, **the browser** requests files from several 3rd party
servers. This means the user's IP address and other data included in a
HTTP request is transmitted to these servers.

-   fonts.googleapis.com (to download fonts)
-   fonts.gstatic.com (to download fonts)
-   h5p.org (to download image resources for the hub)

Due to the open and modular nature of H5P it is impossible to fully list what
every content type does. You should be aware of the fact that some H5P content
types access resources from 3rd party servers in the browser through AJAX calls
or direct references, which means the IP address and other metadata is
transmitted to these server. Content types like 'speak the words' transmit
personal data (the user's voice) to 3rd party server (Google in this case, if
the user's browser is Google Chrome). **It is your responsibility to check and
document what individual content types you choose to install on your server do
with your users' data!**
