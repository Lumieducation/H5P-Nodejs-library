# Impersonating users

It is possible to impersonate users when viewing a H5P object. This means that
you can display another user's user state instead of your own. This is useful,
if you want to implement a feature in which teachers can review the work of
students.

You do this by setting `options.asUserId` of the `H5PPlayer.render` method. Make
sure that you [authorize users](authorization.md) as required in the permission
system.

## Read-only states

In most cases in which your users impersonate another user, you'll want to
disable saving the user state for the impersonator. You can do this by setting
`options.readOnlyState` to true when calling `H5PPlayer.render`. This will do
the following:

-   set the save interval to the longest possible value
-   adds the query parameter `ignorePost=yes` to the Ajax route responsible for
    handling user states

The query parameter is necessary, as the H5P core client doesn't support user
states that are read only. We work around this by ignoring a post calls when the
query parameter is set in h5p-express. If the query parameter is set, we simply
return a success, so the H5P core client doesn't realize we didn't save the
state. If you don't use this package, you must do this yourself.

Obviously you also have to make sure malicious users won't change the user state
of others, by rejecting these operations in the authorization/permission system!

## Trying it out in the examples

The server-side-rendering example supports impersonation and read-only state.
You can use them by passing in query parameter in the URL, e.g.
`http://localhost:8080/h5p/play/<CONTENTID>?asUserId=<USERID>&readOnlyState=yes`.

The REST example also supports impersonation and read-only states. You can
enable these features in the web interface.

## Acknowledgement

The development of this feature was kindly funded by PHYWE Systeme GmbH und Co.
KG (https://www.phywe.de/).
