/**
 * This file is injected into the HTML bundle (in a minified form) if there were
 * any files in the library directories which weren't already included.
 */

(function () {
    // By providing a custom implementation of H5P.ContentType we can inject the
    // resource files when a H5P content type generates the path to a file.
    H5P.ContentType = function (isRootLibrary) {
        function ContentType() {}
        ContentType.prototype = new H5P.EventDispatcher();
        ContentType.prototype.isRoot = function () {
            return isRootLibrary;
        };
        ContentType.prototype.getLibraryFilePath = function (filePath) {
            return (
                furtherH5PInlineResources[
                    this.libraryInfo.versionedNameNoSpaces + '/' + filePath
                ] || filePath
            );
        };
        return ContentType;
    };

    // We override setting <script src="..."/> behavior to be able to inject scripts
    // that don't use H5P.ContentType.getLibraryFilePath.
    var nativeSetScriptAttribute = HTMLScriptElement.prototype.setAttribute;
    HTMLScriptElement.prototype.setAttribute = function (name, value) {
        if (name === 'src') {
            if (!(value instanceof String)) {
                if (value.toString) {
                    value = value.toString();
                } else {
                    nativeSetScriptAttribute.call(this, name, value);
                    return;
                }
            }
            var basePath = window.location.href.substr(
                0,
                window.location.href.lastIndexOf('/')
            );
            if (value.startsWith(basePath)) {
                value = value.substr(basePath.length + 1);
            }
            var match = value.match(/^.\/libraries\/([^?]+)\??.*$/);
            if (match) {
                const file = match[1];
                if (furtherH5PInlineResources[file]) {
                    value = furtherH5PInlineResources[file];
                }
            }
        }
        nativeSetScriptAttribute.call(this, name, value);
    };
    Object.defineProperty(HTMLScriptElement.prototype, 'src', {
        // also apply the modification if the src is set with the src property
        set(value) {
            this.setAttribute('src', value);
        }
    });

    // We override setting <link href="..."/> to be able to inject styles that don't
    // use H5P.ContentType.getLibraryFilePath.
    var nativeSetLinkAttribute = HTMLLinkElement.prototype.setAttribute;
    HTMLLinkElement.prototype.setAttribute = function (name, value) {
        if (name === 'href') {
            if (!(value instanceof String)) {
                if (value.toString) {
                    value = value.toString();
                } else {
                    nativeSetScriptAttribute.call(this, name, value);
                    return;
                }
            }
            var basePath = window.location.href.substr(
                0,
                window.location.href.lastIndexOf('/')
            );
            if (value.startsWith(basePath)) {
                value = value.substr(basePath.length + 1);
            }
            var match = value.match(/^.\/libraries\/([^?]+)\??.*$/);
            if (match) {
                const file = match[1];
                if (furtherH5PInlineResources[file]) {
                    value = furtherH5PInlineResources[file];
                }
            }
        }
        nativeSetLinkAttribute.call(this, name, value);
    };
    Object.defineProperty(HTMLLinkElement.prototype, 'src', {
        // also apply the modification if the src is set with the src property
        set(value) {
            this.setAttribute('src', value);
        }
    });
})();
