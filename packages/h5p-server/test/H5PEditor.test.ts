import axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import path from 'path';
import { readFile } from 'fs/promises';

import H5PEditor from '../src/H5PEditor';
import H5PConfig from '../src/implementation/H5PConfig';
import InMemoryStorage from '../src/implementation/InMemoryStorage';

import User from './User';

describe('H5PEditor: general', () => {
    const axiosMock = new AxiosMockAdapter(axios);

    it("updates ContentTypeCache if it hasn't been downloaded before", async () => {
        const config = new H5PConfig(new InMemoryStorage());
        const h5pEditor = new H5PEditor(
            new InMemoryStorage(),
            config,
            null,
            null,
            null
        );

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                JSON.parse(
                    await readFile(
                        path.resolve(
                            'test/data/content-type-cache/registration.json'
                        ),
                        'utf-8'
                    )
                )
            );
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                JSON.parse(
                    await readFile(
                        path.resolve(
                            'test/data/content-type-cache/1-content-type.json'
                        ),
                        'utf-8'
                    )
                )
            );

        await expect(
            h5pEditor.installLibraryFromHub('XYZ', new User())
        ).rejects.toThrow('hub-install-invalid-content-type');
    });

    it("updates ContentTypeCache if it hasn't been downloaded before and tries installing", async () => {
        const config = new H5PConfig(new InMemoryStorage());
        const h5pEditor = new H5PEditor(
            new InMemoryStorage(),
            config,
            null,
            null,
            null
        );

        axiosMock
            .onPost(config.hubRegistrationEndpoint)
            .reply(
                200,
                JSON.parse(
                    await readFile(
                        path.resolve(
                            'test/data/content-type-cache/registration.json'
                        ),
                        'utf-8'
                    )
                )
            );
        axiosMock
            .onPost(config.hubContentTypesEndpoint)
            .reply(
                200,
                JSON.parse(
                    await readFile(
                        path.resolve(
                            'test/data/content-type-cache/1-content-type.json'
                        ),
                        'utf-8'
                    )
                )
            );
        axiosMock
            .onGet(`${config.hubContentTypesEndpoint}H5P.Example1`)
            .reply(500);

        // we check against the error message as we we've told axios to reply with 500 to requests to the Hub endpoint.
        await expect(
            h5pEditor.installLibraryFromHub('H5P.Example1', new User())
        ).rejects.toThrow('Request failed with status code 500');
    });
});
