# Architecture

## General overview

A H5P web-application using this library consists of four components, which communicate between each other:

1. This library on the server-side (in yellow below)
2. Your server (implementation of the interfaces of this library + other endpoints, in blue below)
3. Your web client (running in the browser, in blue below)
4. Joubel's H5P player / editor client (downloaded by you and served by your server, in grey below)

As you can see, this library is not an out-of-the-box solution for all your needs, but **requires you to implement your own server and web client**.

## Example diagram of the editor

The diagram shows how the four components interact in a selection of use cases. Each use case has a specific colour and can be traced through the system by it.

![Diagram showing the components at work](editor-architecture.svg)

You have to implement all the components shown in blue. This library provides the parts in yellow and the grey parts are provided by Joubel's H5P client libraries (downloaded from the PHP implementation). The "Express Adapter" of h5p-nodejs-library deals with all AJAX calls by the H5P JavaScript client. You are free to use it, but can also implement the HTTP endpoints yourself.

Note: The diagram doesn't show a complete list of all use cases and is only intended to illustrate how everything plays together! There is a lot more functionality in the h5p-nodejs-library, which is not listed here.

The player is simpler, as it doesn't have as many endpoints, but works in a comparable way to the structure in the diagram.

## Example implementation

There is a basic example implementation of the server and client (blue parts) using Express in the [`examples`](/examples) folder.
