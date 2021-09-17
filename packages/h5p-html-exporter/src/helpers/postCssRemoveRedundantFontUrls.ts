import { ChildNode, Plugin, Root } from 'postcss';

/**
 * Maps file extensions to font types.
 */
const extensionsMap = {
    eot: 'embedded-opentype',
    ttf: 'truetype',
    otf: 'opentype'
};

/**
 * A list of font types used in CSS.
 */
type FontTypes =
    | 'woff'
    | 'woff2'
    | 'truetype'
    | 'svg'
    | 'embedded-opentype'
    | 'opentype';

/**
 * A PostCSS plugin Removing redundant URLs in @font-face rules by deleting all
 * URLs from src except for a single one.
 * @param fontPreference (optional) the order in which fonts should be kept; the
 * first one in the list is the one that is taken first, if it exists
 * @param removedCallback (optional) this function if executed for each file
 * reference that is removed by the plugin
 */
export default function (
    fontPreference: FontTypes[] = [
        'woff',
        'woff2',
        'truetype',
        'svg',
        'opentype',
        'embedded-opentype'
    ],
    removedCallback?: (filename: string) => void
): Plugin {
    if (!fontPreference || fontPreference.length === 0) {
        throw new Error(
            'You must specify the order in which fonts should be preferred as any array with at least one entry.'
        );
    }

    return {
        postcssPlugin: 'postcss-remove-redundant-font-urls',
        async Once(styles: Root): Promise<void> {
            styles.walkAtRules('font-face', (atRule) => {
                const fonts: {
                    extension: string;
                    filename: string;
                    format: FontTypes;
                    node: ChildNode;
                    sourceText: string;
                }[] = [];

                // Create a list of all fonts used in the @font-face rule.
                atRule.nodes
                    .filter((node) => (node as any).prop === 'src')
                    .forEach((node) => {
                        const regex =
                            /url\(["']?([^'")?#]+)\.(.*?)([?#].+?)?["']?\)( format\(["'](.*?)["']\))?[,$]?/g;
                        let matches: string[];
                        // eslint-disable-next-line no-cond-assign
                        while ((matches = regex.exec((node as any).value))) {
                            const format =
                                matches[5] ??
                                extensionsMap[matches[2]] ??
                                matches[2];
                            fonts.push({
                                format,
                                node,
                                sourceText: matches[0],
                                filename: matches[1],
                                extension: matches[2]
                            });
                        }
                    });

                // Determine which font should be kept by sorting the list.
                const fontToKeep = fonts.sort((a, b) => {
                    const indexA = fontPreference.indexOf(a.format);
                    const indexB = fontPreference.indexOf(b.format);
                    return (
                        (indexA === -1 ? fontPreference.length : indexA) -
                        (indexB === -1 ? fontPreference.length : indexB)
                    );
                })[0];

                // Remove all other fonts from the rule.
                fonts.forEach((f) => {
                    if (f === fontToKeep) {
                        return;
                    }
                    let newValue = (f.node as any).value as string;
                    newValue = newValue.replace(f.sourceText, '').trim();
                    if (newValue.endsWith(',')) {
                        newValue = newValue.substr(0, newValue.length - 1);
                    }
                    if (removedCallback) {
                        removedCallback(`${f.filename}.${f.extension}`);
                    }

                    // Delete the whole src node if it has become empty because
                    // of the removed font.
                    if (newValue.trim() === '') {
                        atRule.removeChild(f.node);
                    } else {
                        (f.node as any).value = newValue.trim();
                    }
                });
            });
        }
    };
}
