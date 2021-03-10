import AwaitLock from 'await-lock';

const lock = new AwaitLock();

/**
 * Adds JavaScript file references to the DOM of the target element. If the
 * script was already added to the target element, it is not added a second
 * time. Makes sure the scripts are loaded in the order of the list.
 * @param scripts a list URLS to JavaScript files
 * @param target the element to which the scripts should be added.
 * @returns ignore the return value
 */
export async function addScripts(
    scripts: string[],
    target: HTMLElement
): Promise<any> {
    // We need to lock this function to avoid it being started nearly
    // simultaneously. This can happen if several instances of the web component
    // are added to the DOM at the same time. This can lead to situations in
    // which the second run finds scripts that were already added to the DOM,
    // but aren't parsed by the browser. The addScripts promise the resolves at
    // a time when not all scripts have been fully loaded. This means that the
    // global H5P objects and functions are not available yet, even though they
    // should be.
    await lock.acquireAsync();
    try {
        const existingScripts = Array.from(
            target.getElementsByTagName('script')
        ).map((el) => el.dataset.h5pSrc);
        await Promise.all(
            scripts.map((scriptUrl) => {
                // Only add scripts once
                if (
                    existingScripts.some(
                        (existingSrc) => existingSrc === scriptUrl
                    )
                ) {
                    return Promise.resolve();
                }
                const scriptTag = document.createElement('script');
                scriptTag.src = scriptUrl;
                // We store the original src used by H5P as the protocol and
                // hostname are part of the src attribute.
                scriptTag.dataset.h5pSrc = scriptUrl;
                scriptTag.async = false;
                scriptTag.defer = true;
                const promise = new Promise<void>((res, rej) => {
                    scriptTag.onload = (): void => {
                        res();
                    };
                    scriptTag.onerror = rej;
                });

                target.appendChild(scriptTag);
                return promise;
            })
        );
    } finally {
        lock.release();
    }
}

/**
 * Adds links to CSS files to the DOM of the target element. If a stylesheet was
 * already added to the target element, it is not added a second time.
 * @param styles a list of URLs to stylesheets to add
 * @param target the element to which the scripts should be added
 * @param addFontsToHead if true, @font-face rules found in the loaded
 * stylesheets will also be duplicated and added to the head of the document.
 * This is necessary to load fonts that should be displayed inside the shadow
 * DOM.
 */
export function addStylesheets(styles: string[], target: HTMLElement): void {
    const existingTargetStylesheets = Array.from(
        target.getElementsByTagName('link')
    ).map((el) => el.dataset.h5pHref);

    for (const styleUrl of styles) {
        // Only add stylesheets once
        if (existingTargetStylesheets.some((h5pHref) => h5pHref === styleUrl)) {
            continue;
        }
        const stylesheet = document.createElement('link');
        // We store the original href in the data-h5p-attribute as the browser
        // internally adds the protocol and hostname to the href attribute.
        stylesheet.dataset.h5pHref = styleUrl;
        stylesheet.rel = 'stylesheet';
        stylesheet.href = styleUrl;
        stylesheet.type = 'text/css';
        target.appendChild(stylesheet);
    }
}
