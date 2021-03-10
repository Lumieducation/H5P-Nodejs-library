import LibraryManager from '../src/LibraryManager';
import SemanticsEnforcer from '../src/SemanticsEnforcer';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import { IInstalledLibrary, ILibraryName, ISemanticsEntry } from '../src/types';

jest.mock('../src/implementation/fs/FileLibraryStorage');

// The tests here try some of the (many) XSS attacks listed here:
// https://owasp.org/www-community/xss-filter-evasion-cheatsheet

describe('SemanticsEnforcer', () => {
    function prepare(
        semantics: ISemanticsEntry[],
        libraryName?: ILibraryName
    ): SemanticsEnforcer {
        const libraryStorage = new FileLibraryStorage('');
        libraryStorage.getLibrary = (
            ignored: ILibraryName
        ): Promise<IInstalledLibrary> =>
            Promise.resolve({
                title: 'Example',
                majorVersion: libraryName?.majorVersion ?? 1,
                minorVersion: libraryName?.minorVersion ?? 0,
                patchVersion: 0,
                runnable: 1,
                machineName: libraryName?.machineName ?? 'H5P.Example',
                restricted: false,
                compare: (otherLibrary: IInstalledLibrary) => 0,
                compareVersions: (
                    otherLibrary: ILibraryName & { patchVersion?: number }
                ) => 0
            });
        const libraryManager = new LibraryManager(libraryStorage);
        libraryManager.getSemantics = () => Promise.resolve(semantics);

        const enforcer = new SemanticsEnforcer(libraryManager);
        return enforcer;
    }

    async function compare(
        original: string,
        expected: string,
        allowedTags?: string[],
        allowedStyles?: {
            background?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
            color?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
            family?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
            height?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
            size?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
            spacing?:
                | boolean
                | { css: string; default?: boolean; label: string }[];
        },
        maxLength?: number,
        optional?: boolean,
        regexp?: {
            modifiers: string;
            pattern: string;
        }
    ): Promise<void> {
        const enforcer = prepare([
            {
                label: 'Test',
                name: 'test',
                type: 'text',
                default: 'Hello world!',
                tags: allowedTags,
                font: allowedStyles,
                maxLength,
                optional,
                regexp
            }
        ]);
        const params = {
            test: original
        };
        await enforcer.enforceSemanticStructure(params, {
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });
        expect(params).toMatchObject({
            test: expected
        });
    }

    it('leaves harmless text as it is', async () => {
        await compare('Hello world!', 'Hello world!');
    });

    it("doesn't escape already escaped text.", async () => {
        await compare('Hello &amp; world!', 'Hello &amp; world!');
    });

    it('strips dangerous html tags from text that allows html', async () => {
        await compare(
            '<script>alert("Danger!");</script>Hello world!',
            'Hello world!',
            ['b']
        );
        await compare(
            "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'><b>content</content>",
            'javascript:/*--&gt;<b>content</b>',
            ['b']
        );
    });

    it('strips dangerous links from text that allows html', async () => {
        await compare(
            '<a href="javascript:alert(\'XSS\');">trap</a>',
            '<a>trap</a>',
            ['a']
        );
        await compare(
            "<a href=javascript:alert('XSS')>trap</a>",
            '<a>trap</a>',
            ['a']
        );
        await compare(
            "<a href=JaVaScRiPt:alert('XSS')>trap</a>",
            '<a>trap</a>',
            ['a']
        );
        await compare(
            '<a href=javascript:alert(&quot;XSS&quot;)>trap</a>',
            '<a>trap</a>',
            ['a']
        );
        await compare(
            '<a href="javascript:alert(&quot;XSS&quot;)">trap</a>',
            '<a>trap</a>',
            ['a']
        );
        await compare("<svg/onload=alert('XSS')>content", 'content', ['a']);
        await compare(
            "<BODY ONLOAD=alert('XSS')>content</BODY>",
            '<body>content</body>',
            ['body']
        );
    });

    it('leaves a href attributes that are not dangerous', async () => {
        await compare(
            '<a href="relative/link.html">safe link</a>',
            '<a href="relative/link.html">safe link</a>',
            ['a']
        );
        await compare(
            '<a href="https://absolute.com/link.html">safe link</a>',
            '<a href="https://absolute.com/link.html">safe link</a>',
            ['a']
        );
    });

    it('strips dangerous html tags from text even if it is allowed', async () => {
        await compare(
            '<script>alert("Danger!");</script>Hello world!',
            'Hello world!',
            ['script']
        );
    });

    it('strips dangerous attributes tags from allowed tags', async () => {
        await compare(
            "<b onmouseover=alert('XSS testing!')>content</b>",
            '<b>content</b>',
            ['b']
        );
    });

    it('strips disallowed styles from tags', async () => {
        await compare(
            '<div style="xss:expr/*XSS*/ession(alert(\'XSS\'))">Hello world!</div>',
            '<div>Hello world!</div>',
            ['div']
        );

        await compare(
            '<div style="font-size:error;">Hello world!</div>',
            '<div>Hello world!</div>',
            ['div'],
            {
                size: true
            }
        );
    });

    it('keeps allowed styles in tags', async () => {
        await compare(
            '<div style="font-size:150%;">Hello world!</div>',
            '<div style="font-size:150%">Hello world!</div>',
            ['div'],
            {
                size: true
            }
        );
    });

    it('clips long text', async () => {
        await compare(
            '12345678901234567890123456789012345678901234567890',
            '12345678901234567890',
            undefined,
            undefined,
            20
        );
    });

    it('removes text not matching regexp pattern (if set to optional)', async () => {
        await compare('asdbk45', '', undefined, undefined, undefined, true, {
            modifiers: 'i',
            pattern: '^[a-z]+$'
        });
    });

    it('keeps text matching regexp pattern (if set to optional)', async () => {
        await compare(
            'asdskdjgkortjkt',
            'asdskdjgkortjkt',
            undefined,
            undefined,
            undefined,
            true,
            {
                modifiers: 'i',
                pattern: '^[a-z]+$'
            }
        );
    });

    it("doesn't break if you include delimiters in regexp pattern", async () => {
        await compare(
            'asd/asd',
            'asd/asd',
            undefined,
            undefined,
            undefined,
            true,
            {
                modifiers: 'i',
                pattern: '^asd/asd$'
            }
        );
    });
});
