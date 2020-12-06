import postCss from 'postcss';

import postCssRemoveRedundantUrls from '../../src/helpers/postCssRemoveRedundantFontUrls';

describe('postCssRemoveRedundantFonts.test', () => {
    it('removes redundant fonts', async () => {
        const result = await postCss(postCssRemoveRedundantUrls()).process(
            `@font-face { src: url(path/to/font.woff) format("woff"), url(path/to/font.otf) format("opentype"); }`
        );
        expect(result.css).toEqual(
            `@font-face { src: url(path/to/font.woff) format("woff"); }`
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
});
