/* eslint-disable @typescript-eslint/dot-notation */

import sanitizeHtml from 'sanitize-html';

import { ContentScanner } from './ContentScanner';
import LibraryManager from './LibraryManager';
import Logger from './helpers/Logger';
import { ILibraryName, ISemanticsEntry } from './types';

const log = new Logger('SemanticsEnforcer');

/**
 * Validates the params received by the editor or when uploading content against
 * the schema specified in the semantic structure of the H5P libraries used for
 * the content.
 *
 * IMPORTANT: This class is very incomplete and mostly only a stub!
 */
export default class SemanticsEnforcer {
    constructor(libraryManager: LibraryManager) {
        log.info('initialize');
        this.contentScanner = new ContentScanner(libraryManager);
    }

    private contentScanner: ContentScanner;

    /**
     * Makes sure the params follow the semantic structure of the library.
     * IMPORTANT: This method changes the contents of mainParams!
     * @param mainParams the params; THIS PARAMETER IS MANIPULATED BY THIS
     * METHOD!
     * @param mainLibraryName
     */
    public async enforceSemanticStructure(
        mainParams: any,
        mainLibraryName: ILibraryName
    ): Promise<void> {
        log.debug('Starting to enforcing semantic structure.');
        await this.contentScanner.scanContent(
            mainParams,
            mainLibraryName,
            (semantics, params, jsonPath, parentParams) => {
                let deleteMe = false;
                if (semantics.type === 'library') {
                    const result = this.enforceLibrarySemantics(
                        semantics,
                        params,
                        parentParams,
                        jsonPath
                    );
                    deleteMe = result.deleteMe;
                } else if (semantics.type === 'text') {
                    this.enforceTextSemantics(
                        semantics,
                        params,
                        parentParams,
                        jsonPath
                    );
                }

                if (deleteMe) {
                    log.debug(
                        `Enforcing library semantics by deleting params path ${jsonPath}.`
                    );
                    delete parentParams[semantics.name];
                    return true;
                }
                return false;
            }
        );
    }

    /**
     * See h5p.classes.php:3994 for how the PHP implementation does this.
     * @param semantics
     * @param params
     * @param parentParams
     * @param jsonPath
     */
    private enforceLibrarySemantics(
        semantics: ISemanticsEntry,
        params: any,
        parentParams: any,
        jsonPath: string
    ): { deleteMe: boolean } {
        log.debug('Enforcing structure of a library element.');
        let deleteMe: boolean;
        if (!params.library) {
            log.debug(
                `Found a library entry without a library property (${jsonPath}). Marking it for deletion.`
            );
            // We silently delete the params in this case, as the H5P editor
            // sometimes creates malformed library entries and this is not an
            // error by the user.
            deleteMe = true;
        } else {
            const allowedLibraries = semantics.options
                ?.map((o) => (typeof o === 'string' ? o : o.name))
                ?.filter((o) => o);
            if (
                !allowedLibraries ||
                !allowedLibraries.includes(params.library)
            ) {
                log.debug(
                    `Library check: Found a library entry with a library that is not specified in the options. Allowed are: ${allowedLibraries.join(
                        ', '
                    )}. Library is set to: ${params.library} (${jsonPath}).`
                );
                deleteMe = true;
            }
        }
        // Further checks that should be performed here:
        // - Check if library version is only a different version from the one
        //   specified in options, or if library is not allowed in general.
        //   (delete the params entry in either case, but report different
        //   errors)
        // - Validate subcontent metadata (.metadata property)
        // - Filter out params that are not valid per se (only library, params,
        //   subContentId, metadata and the list in 'extraAttributes' is
        //   allowed). Remove all other keys in params.
        // - If subContentId exists: check if it is a properly formatted string
        //   (/^\{?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\}?$/)
        //   and delete the subContentId if it's not.

        return {
            deleteMe
        };
    }

    /**
     * Checks if a text entry conforms to the semantics and enforces the
     * semantics if necessary. Implements all checks of the PHP version, but
     * does not include error reporting at the moment.
     */
    private enforceTextSemantics(
        semantics: ISemanticsEntry,
        params: any,
        parentParams: any,
        jsonPath: string
    ): void {
        // TODO:
        // - respect detailed font specifications in style filter
        // - report errors to user

        log.debug('Checking contents of text entry');
        let newText: string = params;
        if (!newText) {
            newText = '';
        }

        // Filter out disallowed HTML tags to prevent XSS attacks.
        if (semantics.tags) {
            // We always allow divs, spans, p and br.
            let allowedTags = ['div', 'span', 'p', 'br', ...semantics.tags];
            // We add related HTML tags
            if (allowedTags.includes('table')) {
                allowedTags = [
                    ...allowedTags,
                    'tr',
                    'td',
                    'th',
                    'colgroup',
                    'thead',
                    'tbody',
                    'tfoot',
                    'caption'
                ];
            }
            if (allowedTags.includes('strong')) {
                allowedTags.push('b');
            } else if (allowedTags.includes('b')) {
                allowedTags.push('strong');
            }
            if (allowedTags.includes('em')) {
                allowedTags.push('i');
            } else if (allowedTags.includes('i')) {
                allowedTags.push('em');
            }
            if (allowedTags.includes('ul') || allowedTags.includes('ol')) {
                allowedTags.push('li');
            }
            if (allowedTags.includes('del') || allowedTags.includes('strike')) {
                allowedTags.push('s');
            }
            const uniqueTags = new Set<string>(allowedTags);
            // We never allow inherently unsafe tags, even if the library would
            // allow this.
            uniqueTags.delete('script');
            uniqueTags.delete('style');
            uniqueTags.delete('textarea');
            uniqueTags.delete('option');
            allowedTags = Array.from(uniqueTags);

            // Text alignment is always allowed.
            const allowedStyles = {
                'text-align': [/^(center|left|right|justify)$/i]
            };
            // We only allow the styles set in the semantics.
            if (semantics.font) {
                if (semantics.font.size) {
                    allowedStyles['font-size'] = [/^[0-9.]+(em|px|%)$/i];
                }
                if (semantics.font.family) {
                    allowedStyles['font-family'] = [/^[-a-z0-9," ]+$/i];
                }
                if (semantics.font.color) {
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    allowedStyles['color'] = [
                        /^(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\))$/i
                    ];
                }
                if (semantics.font.background) {
                    allowedStyles['background-color'] = [
                        /^(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\))$/i
                    ];
                }
                if (semantics.font.spacing) {
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    allowedStyles['spacing'] = [/^[0-9.]+(em|px|%)$/i];
                }
                if (semantics.font.height) {
                    allowedStyles['line-height'] = [/^[0-9.]+(em|px|%)$/i];
                }
            }

            const tableCellStyle = allowedTags.includes('table')
                ? {
                      'white-space': [/^(nowrap)|(normal)|(pre)$/i],
                      'text-align': [/^(center|left|right|justify)$/i],
                      'vertical-align': [
                          /^(baseline)|(text-top)|(text-bottom)|(sub)|(super)$/i
                      ],
                      height: [/^[0-9.]+(em|px|%)$/i],
                      width: [/^[0-9.]+(em|px|%)$/i],
                      'background-color': [
                          /^(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\))$/i
                      ],
                      'border-color': [
                          /^(#[a-f0-9]{3}[a-f0-9]{3}?|rgba?\([0-9, ]+\))$/i
                      ]
                  }
                : undefined;

            log.debug('Filtering out disallowed HTML tags');

            newText = sanitizeHtml(newText, {
                allowedTags,
                allowedAttributes: {
                    '*': ['style'], // styles are filtered, so we can allow this
                    a: ['href', 'hreflang', 'media', 'rel', 'target'],
                    td: ['colspan', 'rowspan', 'headers'],
                    th: ['colspan', 'rowspan', 'headers', 'scope'],
                    ol: ['start', 'reversed'],
                    table: [
                        'summary',
                        'cellspacing',
                        'cellpadding',
                        'border',
                        'align'
                    ]
                },
                allowedStyles: {
                    '*': allowedStyles,
                    table: allowedTags.includes('table')
                        ? {
                              height: [/^[0-9.]+(em|px|%)$/i],
                              width: [/^[0-9.]+(em|px|%)$/i]
                          }
                        : undefined,
                    td: tableCellStyle,
                    th: tableCellStyle
                }
            });
        }

        // Check if string has the required length
        if (semantics.maxLength && newText.length > semantics.maxLength) {
            log.debug('Clipping string that is too long');
            newText = newText.substring(0, semantics.maxLength);
        }

        // Check if string conforms to regexp (if given and if set to optional)
        if (newText !== '' && semantics.optional && semantics.regexp) {
            const regexp = new RegExp(
                semantics.regexp.pattern,
                semantics.regexp.modifiers
            );
            if (!regexp.test(newText)) {
                log.debug(
                    `Provided string does not conform to regexp in semantics (value: ${newText}, regexp: ${semantics.regexp})`
                );
                newText = '';
            }
        }

        parentParams[semantics.name] = newText;
    }
}
