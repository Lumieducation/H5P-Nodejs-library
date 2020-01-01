import axios from 'axios';
import axiosMockAdapter from 'axios-mock-adapter';

import EditorConfig from '../examples/implementation/EditorConfig';
import H5PEditor from '../src/H5PEditor';
import TranslationService from '../src/TranslationService';

import InMemoryStorage from '../examples/implementation/InMemoryStorage';
import User from '../examples/implementation/User';

describe('H5PEditor: general', () => {
    const axiosMock = new axiosMockAdapter(axios);

    it("updates ContentTypeCache if it hasn't been downloaded before", async () => {
        const config = new EditorConfig(new InMemoryStorage());
        const h5pEditor = new H5PEditor(
            new InMemoryStorage(),
            config,
            null,
            null,
            new TranslationService({
                'hub-install-invalid-content-type':
                    'hub-install-invalid-content-type'
            }),
            null
        );

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                require('./data/content-type-cache/1-content-type.json')
            );

        await expect(
            h5pEditor.installLibrary('XYZ', new User())
        ).rejects.toThrow('hub-install-invalid-content-type');
    });

    it("updates ContentTypeCache if it hasn't been downloaded before and tries installing", async () => {
        const config = new EditorConfig(new InMemoryStorage());
        const h5pEditor = new H5PEditor(
            new InMemoryStorage(),
            config,
            null,
            null,
            new TranslationService({
                'hub-install-invalid-content-type':
                    'hub-install-invalid-content-type'
            }),
            null
        );

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(200, require('./data/content-type-cache/registration.json'));
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                require('./data/content-type-cache/1-content-type.json')
            );
        axiosMock
            .onGet(`${config.hubContentTypesEndpoint}H5P.Example1`)
            .reply(500);

        // we check against the error message as we we've told axios to reply with 500 to requests to the Hub endpoint.
        await expect(
            h5pEditor.installLibrary('H5P.Example1', new User())
        ).rejects.toThrow('Request failed with status code 500');
    });
});
