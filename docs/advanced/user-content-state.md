---
title: User content state
group: Documents
category: Features
---

# User content state

The H5P client is capable of saving the current state of the user so that the
user can resume where they left off. This means that e.g. their attempts entered
into textboxes are the same as when they last left off.

## How it works

- If state saving is enabled, a timer interval is set in the H5PIntegration
  object by the server
- The H5P core client reads the interval and tells the content type that is
  currently being displayed to persist it's state into a JSON object
- The H5P core client sends the state to an AJAX route on the server (specified
  in H5PIntegration).
- The server stores the state in a special storage system. When content is
  deleted, the user state is deleted as well. When content is updated, the user
  state is deleted if the content type requests this (the case for (nearly?) all
  content types).
- When the user later re-opens the content, the server checks if there is a user
  state for the user that should be "preloaded". This means that the initial
  information about the content object also includes the state and the client
  doesn't have to make a second request to get it. If the state is marked as
  "preloaded" (this is done by the content type), the content type uses it
  during it's initialization routine.
- If "preloaded" is set to `false` the H5P client can also request the user
  state through an AJAX call from the server.
- There can also be a user state in the editor. For instance, it saves whether
  the user has dismissed the tours of Interactive Video or has closed one of the
  yellow "information boxes" that explain functions of the editor. The editor
  always gets the state through a second AJAX call.

## Limitations of the user state

- Not all content types implement it.
- Not all content types fully restore the state (e.g. they don't restore if the
  user has already pressed "checked").

## Enabling user state

- Create an instance of {@link
  @lumieducation/h5p-server!IContentUserDataStorage}. The recommended storage
  class for production is {@link
  @lumieducation/h5p-mongos3!MongoContentUserDataStorage |
  MongoContentUserDataStorage}. There's also a file-based implementation {@link
  @lumieducation/h5p-server!fsImplementations.FileContentUserDataStorage} that
  you can use for development or testing purposes.
- Pass the implementation of {@link
  @lumieducation/h5p-server!IContentUserDataStorage | IContentUserDataStorage}
  into the `H5PEditor` and `H5PPlayer` constructor.
- Set `contentUserStateSaveInterval` in {@link
  @lumieducation/h5p-server!IH5PConfig} to the interval at which the client
  should save the state (in milliseconds). The recommended number is `10000`.
  (To disable the feature, set `contentUserStateSaveInterval` to `false`)
- If you use {@link @lumieducation/h5p-express!h5pAjaxExpressRouter}, then the
  routes for the AJAX endpoint are automatically created. You can manually turn
  them on by setting `routeContentUserData` in the options when creating the
  route.
- If you don't use `h5pAjaxExpressRouter`, you have to route everything
  manually. First get {@link
  @lumieducation/h5p-server!H5PEditor.contentUserDataManager |
  contentUserDataManager} from `H5PEditor` or `H5PPlayer`. Route these endpoints
  to the functions and return HTTP status code 200 with a JSON object that is
  based on {@link @lumieducation/h5p-server!AjaxSuccessResponse} with empty
  payload (Check out the Express Router for details):
    - GET {{contentUserDataUrl}}/:contentId/:dataType/:subContentId ->
      `ContentUserDataManager.getContentUserData`
    - POST {{contentUserDataUrl}}/:contentId/:dataType/:subContentId ->
      `ContentUserDataManager.createOrUpdateContentUserData`

## Configuration options

- You can customize the URL at which the AJAX calls are available by setting
  {@link @lumieducation/h5p-server!IH5PConfig.contentUserDataUrl |
  `contentUserDataUrl` in `IH5PConfig`}.
- You can customize the interval at which content states are saved by setting
  {@link @lumieducation/h5p-server!IH5PConfig.contentUserStateSaveInterval |
  `contentUserStateSaveInterval` in IH5PConfig}. If you set it to false, you can
  disable the feature.

## Security considerations

You should implement CSRF tokens when using the content user state as the POST
endpoint would otherwise by vulnerable to CSRF attacks when using cookie
authentication. The tokens are added to the endpoint URL in the IUrlGenerator
implementation and thus sent to the server whenever a POST call is made. Check
out the REST example on how to pass the CSRF token to the H5P server components
and how to check its validity.
