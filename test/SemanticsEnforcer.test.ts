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
        libraryManager.getSemantics = (library) => Promise.resolve(semantics);

        const enforcer = new SemanticsEnforcer(libraryManager);
        return enforcer;
    }

    async function compare(
        original: string,
        expected: string,
        allowedTags?: string[]
    ): Promise<void> {
        const enforcer = prepare([
            {
                label: 'Test',
                name: 'test',
                type: 'text',
                default: 'Hello world!',
                tags: allowedTags
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

    it("strips html tags from text that doesn't allow html", async () => {
        await compare(
            '<script>alert("Danger!");</script>Hello world!',
            '&lt;script&gt;alert(&quot;Danger!&quot;);&lt;/script&gt;Hello world!'
        );
        await compare(
            "<b onmouseover=alert('XSS testing!')></b>",
            '&lt;b onmouseover=alert(&#39;XSS testing!&#39;)&gt;&lt;/b&gt;'
        );
        await compare(
            "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>",
            'javascript:/*--&gt;&lt;/title&gt;&lt;/style&gt;&lt;/textarea&gt;&lt;/script&gt;&lt;/xmp&gt;&lt;svg/onload=&#39;+/&quot;/+/onmouseover=1/+/[*/[]/+alert(1)//&#39;&gt;'
        );
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
});
