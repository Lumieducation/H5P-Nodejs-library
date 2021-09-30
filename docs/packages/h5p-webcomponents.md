# h5p-webcomponents

This package provides plain HTML 5 Web Components that you can use in your
project to insert H5P players or editors without having to worry about the
details of setting up H5P, loading scripts and styles etc. **They only work in
conjunction with a custom H5P server (e.g. one using
[@lumieducation/h5p-server](https://www.npmjs.com/package/@lumieducation/h5p-server))**
that provides endpoints that do these things:

- get the required data about content (one for playing, one for editing)
- save content created in the editor
- serve all AJAX endpoints required by the H5P core

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
$ npm install @lumieducation/h5p-webcomponents
```

Then, import the component in your JavaScript code and register the h5p-player
or h5p-editor tag globally:

```js
 import { H5PPlayerComponent, H5PEditorComponent } from '@lumieducation/h5p-webcomponents';
 window.customElements.define('h5p-player', H5PPlayerComponent);
 window.customElements.define('h5p-editor', H5PEditorComponent);
```

There is also a convenience function that you can use instead of importing the
components manually:

```js
import { defineElements } from '@lumieducation/h5p-webcomponents';
defineElements('h5p-player'); // only registers the player component
defineElements('h5p-editor'); // only registers the editor component
defineElements('h5p-player', 'h5p-editor'); // registers player and editor component
defineElements(); // registers player and editor component
```

Then, you can insert the components into your DOM:

**Option 1:** Insert it directly in HTML markup:

```html
<h5p-player id='player' content-id='XXXX'></h5p-player>
<h5p-editor id='editor' content-id='XXXX'></h5p-editor>
```

and later set the `loadContentCallback` (and saveContentCallback for the editor)
attribute from your JavaScript code.

```js
document.getElementById('player').loadContentCallback = async (contentId) => { /** retrieve content model from server and return it as Promise **/ };
document.getElementById('editor').loadContentCallback = async (contentId) => { /** retrieve content model from server and return it as Promise **/ };
document.getElementById('editor').saveContentCallback = async (contentId, requestBody) => { /** save content on server **/ };
```

**Option 2:** Create the component in JavaScript:

```js
const h5pPlayer = document.createElement('h5p-player');
h5pPlayer.setAttribute('content-id', 'XXXX');
h5pPlayer.loadContentCallback = async (contentId) => { /** retrieve content model from server and return it as Promise **/ };
someOtherElement.appendChild(h5pPlayer);

const h5pEditor = document.createElement('h5p-editor');
h5pEditor.setAttribute('content-id', 'XXXX');
h5pEditor.loadContentCallback = async (contentId) => { /** retrieve content model from server and return it as Promise **/ };
h5pEditor.saveContentCallback = async (contentId, requestBody) => { /** save content on server **/ };
someOtherElement.appendChild(h5pEditor);
```

## Initializing and refreshing content

The components automatically (re-)load data from the server by calling
`loadContentCallback` that you must set as a property of the DOM element (see
above for examples). The components won't work without the callback.

The content is automatically loaded from the server after **both** of these
conditions have been fulfilled (in any order):

1) `loadContentCallback` is set
2) `content-id` is set

You can change the value of `content-id` and it will discard the old content and
display the new one. You can also safely remove the component from the DOM.

If you want to use the editor to create new content, you can set the
`content-id` to the string `new`. **Caution: If the newly created content is
saved later, then its `contentId` will be `undefined` in
`saveContententCallback`, not `new`!**

## Saving content in the editor

To save the user's changes in the editor, you have to execute the component's
`save()` method:

```js
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

You must provide these callbacks for the components to work:

### H5PPlayerComponent

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

If you use @lumieducation/h5p-server you will get the necessary information by using a
renderer that simply returns the player model if you call
`H5PPlayer.render(...)`:

```ts
h5pPlayerOnServer.setRenderer(model => model);
const playerModel = await h5pPlayerOnServer.render(contentId, user);
// send playerModel to client and return it in loadContentCallback
```

### H5PEditorComponent

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
h5pEditorOnServer.setRenderer(model => model);
```

Notes:

- `contentId` can be `undefined` if the editor is used to create new content
- The library, metadata and params property of the returned object must
only be defined if `contentId` is defined.
- The callback should throw an error with a message in the message property if
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

## Events

The components emit a few events using the standard `dispatchEvent` method of
the component. You can listen to them by adding an event listener with
`addEventListener`.

### H5PPlayerComponent

#### initialized

This event is emitted by this component when the H5P player has initialized. The
event includes the `contentId` in `event.detail.contentId`. Note: The event is
emitted by H5P at a point when all the scripts but possibly not all resources
(images etc.) might be loaded. You should only use the event as an indication of
initialization state.

#### xAPI

This is an event that is emitted by this component when an action is triggered 
on or inside the H5P content through the H5P player. The event includes the
`statement` in `event.detail.statement`,`context` in  `event.detail.context`, and
`event` in  `event.detail.event`.


### H5PEditorComponent

#### editorloaded

This event is emitted when the H5P editor has been fully loaded and the editor
is usable. It is advisable to block user interaction with the component until
this event has been fired. The event includes the `contentId` in
`event.detail.contentId` and an ubername of the main content type in
`event.detail.ubername`.

#### saved

This event is emitted when saving was successful. The respective `contentId` can
be found in `event.detail.contentId` and the content metadata in
`event.detail.metadata`.

Note: You can also simply use the return value of the `save()` method instead of
subscribing to this event.

#### save-error

This event is emitted when there was an error while saving the content. A more
detailed message can be found in `event.detail.message`.

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

## Support

This work obtained financial support for development from the German
BMBF-sponsored research project "lea.online -" (FKN: 41200147).

Read more about them at the following websites:

- lea.online Blog (German) - blogs.uni-bremen.de/leaonline
- University of Bremen - https://www.uni-bremen.de/en.html
- BMBF - https://www.bmbf.de/en/index.html
