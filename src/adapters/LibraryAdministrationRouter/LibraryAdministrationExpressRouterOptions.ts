/**
 * Allows you to choose which routes you want in the Express Router
 */
export default class LibraryAdministrationExpressRouterOptions {
    public handleErrors?: boolean = true;
    public routeDeleteLibrary?: boolean = true;
    public routeGetLibraries?: boolean = true;
    public routeGetLibrary?: boolean = true;
    public routePatchLibrary?: boolean = true;
    public routePostLibraries?: boolean = true;
}
