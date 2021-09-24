# h5p-react

This package provides two React components that you can use to display H5P
players and editors in React applications without having to worry about the
details of setting up H5P, loading scripts and styles etc. They are simple
wrappers around the h5p-webcomponents package that allow you to use the Web
Components in a native React style (passing in props) without having to register
native event handlers etc.

**The components only work in conjunction with a custom H5P server (e.g. one
using
[@lumieducation/h5p-server](https://www.npmjs.com/package/@lumieducation/h5p-server))**
that provides endpoints that do these things:

-   get the required data about content (one for playing, one for editing)
-   save content created in the editor
-   serve all AJAX endpoints required by the H5P core

It is recommended to checkout the rest example that uses
@lumieducation/h5p-server to see how the component can be used in an
application.

If you are looking for a solution to get the H5P player working without any
server-side components, you should check out [h5p-standalone by
Tunapanda](https://github.com/tunapanda/h5p-standalone).

## Browser support

The components deliberately avoid using component libraries like Polymer in
order to reduce the number of third party dependencies of your project. However,
this also means that your users need to use a browser that supports all the web
component features used in this library (ES6 classes, window.customElements and
custom HTML templates).

As of December 2020 all major browsers that are still supported by their vendors
will work, but if you still need to support legacy browsers like IE 11 or older
Edge versions (before it was based on Chromium), you will have to use polyfills
to get the web components to work. You also have to transpile the library into
ES5. See [this page](https://www.webcomponents.org/polyfills) for more details.

The component also uses some modern JavaScript features like `async/await` and
optional chaining. These features are supported by all cutting-edge modern
browsers as of December 2020. Use a transpiler if you have to support older
browsers.

## Usage

Install the component with npm or yarn:

```sh
$ npm install @lumieducation/h5p-react
```

Then, import the component in your JavaScript / TypeScript code:

```js
import { H5PPlayerUI, H5PEditorUI } from '@lumieducation/h5p-react';
```

Then, you can insert the components into your JSX:

```jsx
<H5PPlayerUI
    id='player'
    contentId='XXXX'
    loadContentCallback = { async (contentId) => { /** retrieve content model from server and return it as Promise **/ } }
    />
<H5PEditorUI
    id='editor'
    contentId='XXXX'
    loadContentCallback = { async (contentId) => { /** retrieve content model from server and return it as Promise **/} }
    saveContentCallback = { async (contentId, requestBody) => { /** save content on server **/ } }/>
```

## Initializing and refreshing content

The components automatically (re-)load data from the server by calling
`loadContentCallback`. The components won't work without the callback.

The content is automatically loaded from the server after **both** of these
conditions have been fulfilled (in any order):

1. `loadContentCallback` is set or changed
2. `contentId` is set

You can change the value of `contentId` and it will discard the old content and
display the new one. You can also safely remove the component from the DOM.

If you want to use the editor to create new content, you can set the `contentId`
to the string `new`. **Caution: If the newly created content is saved later,
then its `contentId` will be `undefined` in `saveContententCallback`, not
`new`!**

## Saving content in the editor

To save the user's changes in the editor, you have to execute the component's
`save()` method (you must get a reference to component by using
`React.createRef`):

```js
const h5pEditor = React.createRef();
// set ref={h5pEditor} on <H5PEditorUI/>
try {
    const { contentId, metadata } = await h5pEditor.save();
    // do something with the return values or ignore them
} catch error {
    // report errors
}
```

The component will perform some client-side validation of the entered data and
call `saveContentCallback` (see below) with all the data needed to save the
content.

## Callbacks

You must provide these callbacks in the props for the components to work:

### H5PPlayerUI

#### loadContentCallback

```ts
loadContentCallback = async (contentId: string) => Promise<IPlayerModel>
/** see types.ts in @lumieducation/h5p-server for details how IPlayerModel looks
    like **/
```

You have to set `loadContentCallback` to a function that retrieves the necessary
data from the backend. It returns a promise of data that follows the structure
of IPlayerModel in [types.ts](/packages/h5p-server/src/types.ts) in
@lumieducation/h5p-server. If there is an error, the callback should throw an
error object with the error message in the `message` property.

If you use @lumieducation/h5p-server you will get the necessary information by
using a renderer that simply returns the player model if you call
`H5PPlayer.render(...)`:

```ts
h5pPlayerOnServer.setRenderer((model) => model);
const playerModel = await h5pPlayerOnServer.render(contentId, user);
// send playerModel to client and return it in loadContentCallback
```

### H5PEditorUI

#### loadContentCallback

```ts
loadContentCallback = async (contentId?: string) => Promise<
    IEditorModel /** see types.ts in @lumieducation/h5p-server for details **/ & {
        library?: string;
        metadata?: IContentMetadata;
        params?: any;
    }>
```

This callback is executed when the component needs to load data for a content
id. The callback must create a request to an endpoint on the server, which
retrieves all necessary information. The server-side implementation of the
endpoint using @lumieducation/h5p-server has to combine the results of
H5PEditor.render(...) and H5PEditor.getContent(...). The render must be set to
simply return the editor model like this:

```js
h5pEditorOnServer.setRenderer((model) => model);
```

Notes:

-   `contentId` can be `undefined` if the editor is used to create new content
-   The library, metadata and params property of the returned object must
    only be defined if `contentId` is defined.
-   The callback should throw an error with a message in the message property if
    something goes wrong.

#### saveContentCallback

```ts
saveContentCallback = async (
    contentId: string,
    requestBody: {
        library: string;
        params: {
            params: any;
            metadata: any;
        }
) => Promise<{ contentId: string; metadata: IContentMetadata }>
```

This callback is executed when the editor was told to save its content. You have
to reach out to the server and persist the changes. When using
@lumieducation/h5p-server, the server-side endpoint should call
`H5PEditor.saveOrUpdateContentReturnMetaData(...)` and then return the result to
the client, which returns the result as the return value of
`saveContentCallback`.

Note: `contentId` can be `undefined`, if the user is creating new content.

## Event Handlers

The components emit a few events, to which you cna subscribe using the `on...`
methods in the props of the components.

### H5PPlayerUI

#### onInitialized

This event handler is called when the H5P player has initialized. The event
includes the `contentId` in the parameters. Note: The event is emitted by H5P at
a point when all the scripts, but possibly not all resources (images etc.) might
be loaded. You should only use the event as an indication of initialization
state.

### onxAPIStatement

This event handler is called when the H5P content fires an xAPI statement. Use
it to collect information about what the user does with your content.

### H5PEditorUI

#### onLoaded

This event handler is called when the H5P editor has been fully loaded and the
editor is usable. It is advisable to block user interaction with the component
until this event has been fired. The event includes the `contentId` and an
ubername of the main content type in the paramters.

#### onSaved

This event handler is called when saving was successful. The respective
`contentId` and content metadata can be found in the paramters.

Note: You can also simply use the return value of the `save()` method instead of
subscribing to this event.

#### onSaveError

This event handler is called when there was an error while saving the content. A more
detailed message can be found in the `message` paramter.

Note: You can also simply catch errors by wrapping the `save()` method in a `try
{...} catch {...}` block instead of subscribing to this event.

## Executing underlying H5P functionality

The H5PPlayerComponent offers properties and methods that can be used to do
things with the underlying "core" H5P data structures and objects:

### h5pInstance

This property is the object found in H5P.instances for the contentId of the
object. Contains things like the parameters of the content, its metadata and
structures created by the content type's JavaScript.

**The object is only available after the `initialized` event was fired.
Important: This object is only partially typed and there are more properties
and methods on it!**

### h5pObject

H5P has a global "H5P" namespace that is often used like this:

```ts
H5P.init(); // initialize H5P
H5P.externalDispatcher.on('xAPI', myCallback);
const dialog = new H5P.Dialog(...);
```

The problem you'll face when you try to use this namespace is that you typically
want to operate on the object inside the H5P iframe if a content type requires
iframe embedding. The h5pObject property solves this problem: It contains the
correct global H5P namespace regardless of whether there's an iframe or not.

You can use it like this:

```ts
const H5Pns = myPlayerComponent.h5pObject;
H5Pns.externalDispatcher.on('xAPI', myCallback);
const dialog = new H5Pns.Dialog(...);
```

**The property is only available after the `initialized` event was fired.
Important: This object is only partially typed and there are more properties and
methods on it!**

### getCopyrightHtml

You can get the copyright notice of the content by calling this method. Returns
undefined if there is not copyright information. Returns HTML code that you must
display somewhere.

### hasCopyrightInformation

Returns true if there is copyright information to be displayed.

### resize

Signals the H5P content inside the component to resize itself according to the
dimensions of the container. Can be called if you have changed the size of the
container in an unusual fashion (e.g. by scaling it with CSS transform) and you
need to resize the content manually. The component already automatically calls
the resize function when its own size is changed, so this will rarely be the
case.

### showCopyright

Shows the copyright information in a window overlaying the H5P content.
