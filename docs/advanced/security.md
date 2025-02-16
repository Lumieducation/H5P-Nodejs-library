# Security

## File sanitization

## Malware scanning

## Restricting library installation

The concept of H5P that H5P packages don't just include the author's content but
all the required libraries that are needed to display the content, creates some
inherent risks. As the libraries in a H5P package include JavaScript, CSS and
SVG files, which are run in the user's browser, H5P basically deliberately
allows Cross-Site-Scripting to some users.

You must make sure that only trustworthy administrators can install and update
H5P content types and libraries by setting up a restrictive [permission
system](./authorization.md)!

In addition, you must make sure that all H5P packages that are uploaded by
administrators only contain safe and trustworthy H5P libraries! Never upload H5P
packages that you got from third-party sites (without thoroughly checking their
contents). It's best to get them directly from the H5P Hub - or if your needed
content types aren't available there directly from the developer.

(Note that it can also mess up your H5P libraries, if user's upload forks of H5P
content types that use the same library names as the original content type. In
this case you can't update the original content type any more, as there are
already "newer" libraries (the fork) in your installation. This error is
difficult to track down. Most users don't know that H5P packages contain the
libraries and that they might "infect" an installation by uploading content
packages. As an application developer and site administrator you must make sure
that this doesn't happen!)
