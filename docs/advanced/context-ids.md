# Multiple content states per object

You can save multiple user states (= the data a learner entered, e.g. the
attempts in a fill-in-the-blanks activity) for one user - content tuple. This is
a useful feature, if you want to allow your users to have more than one attempt
per content object and if they can return to older ones.

This feature is unique to this H5P NodeJs implementation and not part of the
standard H5P PHP server version.

## Usage

If you want to use this feature, your implementation has to provide a
`contextId` in the `H5PPlayer.render` options:

```js
const html = await h5pPlayer.render(
    contentId, // the content id
    user, // the current user
    'auto', // automatic language detection
    {
        contextId: '<YOUR CONTEXT ID>'
        // you can add more options here as well
    }
);
```

Context ids can't be used in the H5P editor, as the user state in the editor is
only used to save things like whether certain info boxes were collapsed.
Multiple contexts wouldn't make sense there.

## Creating contextId

`contextId` is an arbitrary string value that you define in your implementing
system. It is **your** job to keep it unique and to pass it the the `render`
method. Typically it is associated with some other object in your database
anyway (e.g. an attempt object), so you will already have a unique id that you
can use here.

## Using contextIds with old data

It is save to use `contextIds` if you already have user content data in your
system that didn't use contextIds. You can also have user data that has a
`contextId` and other user data that doesn't in the same system.

## Web Components and React

The H5P Player Web Component and React component also support the context id.
You can set the current context id by setting the attribute/property `contextId`
to the desired value. Make sure that you implementation of `loadContentCallback`
accepts `contextId` as the second parameter, that you include it in the request
to the server and that your server passes the contextId to `H5PPlayer.render`.

## Storage support

Both the `FileContentUserDataStorage` and `MongoContentUserDataStorage` support
context ids.

## Trying it out in the examples

The server-side-rendering example supports context ids. You can set the context
id by passing it as a query parameter in the URL, e.g.
`http://localhost:8080/h5p/play/<CONTENTID>?contextId=<CONTEXTID>` where
`<CONTEXTID>` is an arbitrary value you can make up on the fly.

The REST example also supports context ids. You can see the currently used
context id in the user interface after the `#` icon. You can change the current
context id with the button.

## Acknowledgement

The development of this feature was kindly funded by PHYWE Systeme GmbH und Co.
KG (https://www.phywe.de/).
