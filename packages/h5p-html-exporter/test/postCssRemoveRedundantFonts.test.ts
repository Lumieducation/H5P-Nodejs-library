import postCss from 'postcss';

import postCssRemoveRedundantUrls from '../src/helpers/postCssRemoveRedundantFontUrls';

describe('postCssRemoveRedundantFonts.test', () => {
    it('removes redundant fonts', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.woff) format("woff"), url(path/to/font.otf) format("opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.woff) format("woff"); }`
        );
    });

    it('removes redundant fonts in the desired order', async () => {
        const result = await postCss(
            postCssRemoveRedundantUrls(['opentype', 'woff'])
        ).process(
            `@font-face { src: url(path/to/font.woff) format("woff"), url(path/to/font.otf) format("opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.otf) format("opentype"); }`
        );
    });

    it('works with quotation marks', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url('path/to/font.woff') format("woff"), url("path/to/font.otf") format("opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url('path/to/font.woff') format("woff"); }`
        );
    });

    it('also removes redundant fonts of unknown type', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.woff) format("woff"), url(path/to/font.unk) format("unknown"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.woff) format("woff"); }`
        );
    });

    it('calls the callback for removed fonts', async () => {
        const removed = [];
        const result = await postCss(
            postCssRemoveRedundantUrls(undefined, (filename) =>
                removed.push(filename)
            )
        ).process(
            `@font-face { src: url(path/to/font.woff2) format("woff2"), url(path/to/font.woff) format("woff"), url(path/to/font.otf) format("opentype"); }`
        );
        expect(removed).toMatchObject([
            'path/to/font.woff2',
            'path/to/font.otf'
        ]);
    });

    it('removes redundant fonts across multiple srcs', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.woff) format("woff"), url(path/to/font.otf) format("opentype"); src: url(path/to/font.eot) format("embedded-opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.woff) format("woff"); }`
        );
    });

    it("removes redundant fonts if format isn't specified", async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.woff), url(path/to/font.otf); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.woff); }`
        );
    });

    it('keeps single fonts', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.otf) format("opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.otf) format("opentype"); }`
        );
    });

    it('removes real live H5P fonts with query strings', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url('fontawesome-webfont.eot?#iefix&v=4.5.0') format('embedded-opentype'),url('fontawesome-webfont.woff2?v=4.5.0') format('woff2'),url('fontawesome-webfont.woff?v=4.5.0') format('woff'),url('fontawesome-webfont.ttf?v=4.5.0') format('truetype'),url('fontawesome-webfont.svg?v=4.5.0#fontawesomeregular') format('svg'); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url('fontawesome-webfont.woff?v=4.5.0') format('woff'); }`
        );
    });
});
