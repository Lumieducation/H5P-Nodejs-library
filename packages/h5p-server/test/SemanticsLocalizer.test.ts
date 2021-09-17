import fsExtra from 'fs-extra';
import path from 'path';

import SemanticsLocalizer from '../src/SemanticsLocalizer';
import SimpleTranslator from '../src/helpers/SimpleTranslator';

describe('SemanticsLocalizer', () => {
    it('localizes copyright semantics', async () => {
        const translations = await fsExtra.readJson(
            path.resolve(
                'packages/h5p-server/assets/translations/copyright-semantics/en.json'
            )
        );

        const localizer = new SemanticsLocalizer(
            new SimpleTranslator({ 'copyright-semantics': translations }).t
        );

        const localized = localizer.localize(
            await fsExtra.readJson(
                path.resolve(
                    'packages/h5p-server/assets/defaultCopyrightSemantics.json'
                )
            ),
            'en'
        );
        expect(localized).toMatchObject({
            name: 'copyright',
            type: 'group',
            label: 'Copyright information',
            fields: [
                {
                    name: 'title',
                    type: 'text',
                    label: 'Title',
                    placeholder: 'La Gioconda',
                    optional: true
                },
                {
                    name: 'author',
                    type: 'text',
                    label: 'Author',
                    placeholder: 'Leonardo da Vinci',
                    optional: true
                },
                {
                    name: 'year',
                    type: 'text',
                    label: 'Year(s)',
                    placeholder: '1503 - 1517',
                    optional: true
                },
                {
                    name: 'source',
                    type: 'text',
                    label: 'Source',
                    placeholder: 'http://en.wikipedia.org/wiki/Mona_Lisa',
                    optional: true,
                    regexp: {
                        pattern: '^http[s]?://.+',
                        modifiers: 'i'
                    }
                },
                {
                    name: 'license',
                    type: 'select',
                    label: 'License',
                    default: 'U',
                    options: [
                        {
                            value: 'U',
                            label: 'Undisclosed'
                        },
                        {
                            value: 'CC BY',
                            label: 'Attribution',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'CC BY-SA',
                            label: 'Attribution-ShareAlike',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'CC BY-ND',
                            label: 'Attribution-NoDerivs',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'CC BY-NC',
                            label: 'Attribution-NonCommercial',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'CC BY-NC-SA',
                            label: 'Attribution-NonCommercial-ShareAlike',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'CC BY-NC-ND',
                            label: 'Attribution-NonCommercial-NoDerivs',
                            versions: [
                                {
                                    value: '4.0',
                                    label: '4.0 International'
                                },
                                {
                                    value: '3.0',
                                    label: '3.0 Unported'
                                },
                                {
                                    value: '2.5',
                                    label: '2.5 Generic'
                                },
                                {
                                    value: '2.0',
                                    label: '2.0 Generic'
                                },
                                {
                                    value: '1.0',
                                    label: '1.0 Generic'
                                }
                            ]
                        },
                        {
                            value: 'GNU GPL',
                            label: 'General Public License',
                            versions: [
                                {
                                    value: 'v3',
                                    label: 'Version 3'
                                },
                                {
                                    value: 'v2',
                                    label: 'Version 2'
                                },
                                {
                                    value: 'v1',
                                    label: 'Version 1'
                                }
                            ]
                        },
                        {
                            value: 'PD',
                            label: 'Public Domain',
                            versions: [
                                { value: '-', label: '-' },
                                {
                                    value: 'CC0 1.0',
                                    label: 'CC0 1.0 Universal'
                                },
                                {
                                    value: 'CC PDM',
                                    label: 'Public Domain Mark'
                                }
                            ]
                        },
                        { value: 'C', label: 'Copyright' }
                    ]
                },
                {
                    name: 'version',
                    type: 'select',
                    label: 'License Version',
                    options: []
                }
            ]
        });
    });

    it('localizes metadata semantics', async () => {
        const translations = await fsExtra.readJson(
            path.resolve(
                'packages/h5p-server/assets/translations/metadata-semantics/en.json'
            )
        );

        const localizer = new SemanticsLocalizer(
            new SimpleTranslator({ 'metadata-semantics': translations }).t
        );

        const localized = localizer.localize(
            await fsExtra.readJson(
                path.resolve(
                    'packages/h5p-server/assets/defaultMetadataSemantics.json'
                )
            ),
            'en'
        );
        expect(localized).toMatchObject([
            {
                name: 'title',
                type: 'text',
                label: 'Title',
                placeholder: 'La Gioconda'
            },
            {
                name: 'a11yTitle',
                type: 'text',
                label: 'Assistive Technologies label',
                optional: true
            },
            {
                name: 'license',
                type: 'select',
                label: 'License',
                default: 'U',
                options: [
                    { value: 'U', label: 'Undisclosed' },
                    {
                        type: 'optgroup',
                        label: 'Creative Commons',
                        options: [
                            {
                                value: 'CC BY',
                                label: 'Attribution (CC BY)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC BY-SA',
                                label: 'Attribution-ShareAlike (CC BY-SA)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC BY-ND',
                                label: 'Attribution-NoDerivs (CC BY-ND)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC BY-NC',
                                label: 'Attribution-NonCommercial (CC BY-NC)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC BY-NC-SA',
                                label: 'Attribution-NonCommercial-ShareAlike (CC BY-NC-SA)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC BY-NC-ND',
                                label: 'Attribution-NonCommercial-NoDerivs (CC BY-NC-ND)',
                                versions: [
                                    {
                                        value: '4.0',
                                        label: '4.0 International'
                                    },
                                    {
                                        value: '3.0',
                                        label: '3.0 Unported'
                                    },
                                    {
                                        value: '2.5',
                                        label: '2.5 Generic'
                                    },
                                    {
                                        value: '2.0',
                                        label: '2.0 Generic'
                                    },
                                    {
                                        value: '1.0',
                                        label: '1.0 Generic'
                                    }
                                ]
                            },
                            {
                                value: 'CC0 1.0',
                                label: 'Public Domain Dedication (CC0)'
                            },
                            {
                                value: 'CC PDM',
                                label: 'Public Domain Mark (PDM)'
                            }
                        ]
                    },
                    {
                        value: 'GNU GPL',
                        label: 'General Public License v3'
                    },
                    { value: 'PD', label: 'Public Domain' },
                    {
                        value: 'ODC PDDL',
                        label: 'Public Domain Dedication and Licence'
                    },
                    { value: 'C', label: 'Copyright' }
                ]
            },
            {
                name: 'licenseVersion',
                type: 'select',
                label: 'License Version',
                options: [
                    {
                        value: '4.0',
                        label: '4.0 International'
                    },
                    { value: '3.0', label: '3.0 Unported' },
                    { value: '2.5', label: '2.5 Generic' },
                    { value: '2.0', label: '2.0 Generic' },
                    { value: '1.0', label: '1.0 Generic' }
                ],
                optional: true
            },
            {
                name: 'yearFrom',
                type: 'number',
                label: 'Years (from)',
                placeholder: '1991',
                min: '-9999',
                max: '9999',
                optional: true
            },
            {
                name: 'yearTo',
                type: 'number',
                label: 'Years (to)',
                placeholder: '1992',
                min: '-9999',
                max: '9999',
                optional: true
            },
            {
                name: 'source',
                type: 'text',
                label: 'Source',
                placeholder: 'https://',
                optional: true
            },
            {
                name: 'authors',
                type: 'list',
                field: {
                    name: 'author',
                    type: 'group',
                    fields: [
                        {
                            label: "Author's name",
                            name: 'name',
                            optional: true,
                            type: 'text'
                        },
                        {
                            name: 'role',
                            type: 'select',
                            label: "Author's role",
                            default: 'Author',
                            options: [
                                {
                                    value: 'Author',
                                    label: 'Author'
                                },
                                {
                                    value: 'Editor',
                                    label: 'Editor'
                                },
                                {
                                    value: 'Licensee',
                                    label: 'Licensee'
                                },
                                {
                                    value: 'Originator',
                                    label: 'Originator'
                                }
                            ]
                        }
                    ]
                }
            },
            {
                name: 'licenseExtras',
                type: 'text',
                widget: 'textarea',
                label: 'License Extras',
                optional: true,
                description: 'Any additional information about the license'
            },
            {
                name: 'changes',
                type: 'list',
                field: {
                    name: 'change',
                    type: 'group',
                    label: 'Changelog',
                    fields: [
                        {
                            name: 'date',
                            type: 'text',
                            label: 'Date',
                            optional: true
                        },
                        {
                            name: 'author',
                            type: 'text',
                            label: 'Changed by',
                            optional: true
                        },
                        {
                            name: 'log',
                            type: 'text',
                            widget: 'textarea',
                            label: 'Description of change',
                            placeholder: 'Photo cropped, text changed, etc.',
                            optional: true
                        }
                    ]
                }
            },
            {
                name: 'authorComments',
                type: 'text',
                widget: 'textarea',
                label: 'Author comments',
                description:
                    'Comments for the editor of the content (This text will not be published as a part of copyright info)',
                optional: true
            },
            {
                name: 'contentType',
                type: 'text',
                widget: 'none'
            }
        ]);
    });
});
