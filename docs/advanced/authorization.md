---
title: Authorization
group: Documents
category: Features
---

# Authorization

Many actions users perform in the H5P system need authorization. By default the
library will allow everything to every user. You can customize who can do what,
but passing in an implementation of {@link
@lumieducation/h5p-server!IPermissionSystem} into `options.permissionSystem` of
the {@link @lumieducation/h5p-server!H5PPlayer | H5PPlayer} or {@link
@lumieducation/h5p-server!H5PEditor | H5PEditor} constructor. The library then
calls the methods of {@link @lumieducation/h5p-server!IPermissionSystem |
IPermissionSystem} whenever a user performs an action that requires
authorization.

See the documentation of {@link @lumieducation/h5p-server!IPermissionSystem |
IPermissionSystem} for and the
[`ExamplePermissionSystem`](../../packages/h5p-rest-example-server/src/ExamplePermissionSystem.ts)
for reference how to implement the permission system.

Note that {@link @lumieducation/h5p-server!IPermissionSystem |
IPermissionSystem} is a generic. You can use any sub-type of {@link
@lumieducation/h5p-server!IUser} as the generic type. The call of the methods of
{@link @lumieducation/h5p-server!IPermissionSystem | IPermissionSystem} will
include a user of the generic type. This is the user object you've injected in
your controllers. That means you can add any arbitrary date to it, like roles.

## Acknowledgement

The development of this feature was kindly funded by PHYWE Systeme GmbH und Co.
KG (https://www.phywe.de/).
