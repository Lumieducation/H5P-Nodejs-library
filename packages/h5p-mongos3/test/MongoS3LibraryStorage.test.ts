// Note: This test will be ignored by normal test runners. You must execute
// npm run test:db to run it!
// It requires a running MongoDB and S3 instance!

import AWS from 'aws-sdk';
import { Db, Collection, MongoClient, ObjectId } from 'mongodb';
import fsExtra from 'fs-extra';
import path from 'path';

import { ILibraryMetadata, streamToString } from '@lumieducation/h5p-server';
import MongoS3LibraryStorage from '../src/MongoS3LibraryStorage';
import initS3 from '../src/initS3';
import { emptyAndDeleteBucket } from './s3-utils';

describe('MongoS3LibraryStorage', () => {
    let mongo: Db;
    let mongoClient: MongoClient;
    let mongoCollection: Collection<any>;
    let s3: AWS.S3;
    let bucketName: string;
    let collectionName: string;
    let counter = 0;
    let testId: string;
    let storage: MongoS3LibraryStorage;

    const example1Name = {
        machineName: 'H5P.Example1',
        majorVersion: 1,
        minorVersion: 1
    };

    const installMetadata = async (
        filename: string
    ): Promise<ILibraryMetadata> => {
        const metadata = (await fsExtra.readJSON(
            path.resolve(filename)
        )) as ILibraryMetadata;
        await storage.addLibrary(metadata, false);
        return metadata;
    };

    beforeAll(async () => {
        testId = new ObjectId().toHexString();
        s3 = initS3({
            accessKeyId: 'minioaccesskey',
            secretAccessKey: 'miniosecret',
            endpoint: 'http://localhost:9000',
            s3ForcePathStyle: true,
            signatureVersion: 'v4'
        });
        mongoClient = await MongoClient.connect('mongodb://localhost:27017', {
            auth: {
                username: 'root',
                password: 'h5pnodejs'
            },
            ignoreUndefined: true
        });
        mongo = mongoClient.db('h5pintegrationtest');
    });

    beforeEach(async () => {
        counter += 1;
        bucketName = `${testId}bucketlib${counter}`;
        await emptyAndDeleteBucket(s3, bucketName);
        await s3
            .createBucket({
                Bucket: bucketName
            })
            .promise();
        collectionName = `${testId}collectionlib${counter}`;
        try {
            await mongo.dropCollection(collectionName);
        } catch {
            // We do nothing, as we just want to make sure the collection doesn't
            // exist.
        }
        mongoCollection = mongo.collection(collectionName);
        storage = new MongoS3LibraryStorage(s3, mongoCollection, {
            s3Bucket: bucketName
        });
    });

    afterEach(async () => {
        await emptyAndDeleteBucket(s3, bucketName);
        try {
            await mongo.dropCollection(collectionName);
        } catch {
            // If a test didn't create a collection, it can't be deleted.
        }
    });

    afterAll(async () => {
        await mongoClient.close();
    });

    it('installs library metadata', async () => {
        await expect(
            storage.isInstalled({
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            })
        ).resolves.toBe(false);
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        const installed = await storage.addLibrary(metadata, false);
        expect(installed).toBeDefined();
        expect(metadata).toMatchObject({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        await expect(
            storage.isInstalled({
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            })
        ).resolves.toBe(true);
    });

    it('does not install the same library metadata twice', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await expect(
            storage.addLibrary(metadata, false)
        ).resolves.toBeDefined();
        await expect(storage.addLibrary(metadata, false)).rejects.toThrow();
    });

    it('lists installed libraries', async () => {
        const metadata = (await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        )) as ILibraryMetadata;
        await storage.addLibrary(metadata, false);
        const metadata2 = { ...metadata, machineName: 'H5P.Example2' };
        await storage.addLibrary(metadata2, false);
        const metadata3 = { ...metadata, minorVersion: 2 };
        await storage.addLibrary(metadata3, false);

        const libraryNames1 = await storage.getInstalledLibraryNames();
        expect(libraryNames1).toMatchObject([
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            {
                machineName: 'H5P.Example2',
                majorVersion: 1,
                minorVersion: 1
            },
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 2
            }
        ]);
        const libraryNames2 = await storage.getInstalledLibraryNames(
            'H5P.Example1'
        );
        expect(libraryNames2).toMatchObject([
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 2
            }
        ]);
        const libraryNames3 = await storage.getInstalledLibraryNames(
            'H5P.Example2'
        );
        expect(libraryNames3).toMatchObject([
            {
                machineName: 'H5P.Example2',
                majorVersion: 1,
                minorVersion: 1
            }
        ]);
        const libraryNames4 = await storage.getInstalledLibraryNames(
            'H5P.ExampleNOTINSTALLED'
        );
        expect(libraryNames4).toMatchObject([]);
    });

    it('gets the metadata', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await storage.addLibrary(metadata, false);
        const retrievedMetadata = await storage.getLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        expect(retrievedMetadata).toMatchObject({
            ...metadata,
            restricted: false
        });
    });

    it('gets the metadata and its stats as a file (simulates GET on library.json) ', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );

        await storage.addLibrary(metadata, false);
        const retrievedStats = await storage.getFileStats(
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            'library.json'
        );
        const retrievedStream = await storage.getFileStream(
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            'library.json'
        );
        const retrievedMetadata = await streamToString(retrievedStream);
        expect(JSON.parse(retrievedMetadata)).toMatchObject(metadata);
        expect(retrievedMetadata.length).toEqual(retrievedStats.size);
    });

    it('update additional metadata', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await storage.addLibrary(metadata, false);
        const updateResult1 = await storage.updateAdditionalMetadata(
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            {
                restricted: false
            }
        );
        expect(updateResult1).toEqual(false);
        const updateResult2 = await storage.updateAdditionalMetadata(
            {
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            },
            {
                restricted: true
            }
        );
        expect(updateResult2).toEqual(true);
        const retrievedMetadata = await storage.getLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        expect(retrievedMetadata).toMatchObject({
            ...metadata,
            restricted: true
        });
    });

    it('does not update additional metadata if library not installed', async () => {
        await expect(
            storage.updateAdditionalMetadata(
                {
                    machineName: 'H5P.Example1',
                    majorVersion: 1,
                    minorVersion: 1
                },
                {
                    restricted: false
                }
            )
        ).rejects.toThrow('mongo-s3-library-storage:library-not-found');
    });

    it('updates metadata', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await storage.addLibrary(metadata, false);
        const metadata2: ILibraryMetadata = {
            ...metadata,
            patchVersion: 2,
            author: 'test'
        };
        await storage.updateLibrary(metadata2);
        const retrievedMetadata = await storage.getLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        expect(retrievedMetadata).toMatchObject(metadata2);
    });

    it('lists addons', async () => {
        const metadata: ILibraryMetadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        metadata.addTo = {
            content: {
                types: [
                    {
                        text: {
                            regex: '/.*/'
                        }
                    }
                ]
            }
        };
        await storage.addLibrary(metadata, false);
        const metadata2: ILibraryMetadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example3-2.1/library.json`
        );
        await storage.addLibrary(metadata2, false);
        const addons = await storage.listAddons();
        expect(addons.length).toEqual(1);
        expect(addons[0]).toMatchObject({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
    });

    it('deletes libraries', async () => {
        const metadata = await fsExtra.readJSON(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await storage.addLibrary(metadata, false);
        await storage.deleteLibrary({
            machineName: 'H5P.Example1',
            majorVersion: 1,
            minorVersion: 1
        });
        await expect(
            storage.getLibrary({
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            })
        ).rejects.toThrow();
        // TODO: Check if dependent files were removed
    });

    it('throws 404 when trying to delete a non-existing library', async () => {
        await expect(
            storage.deleteLibrary({
                machineName: 'H5P.Example1',
                majorVersion: 1,
                minorVersion: 1
            })
        ).rejects.toThrow('mongo-s3-library-storage:library-not-found');
    });

    it('returns the correct number of dependent libraries', async () => {
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib1-1.0/library.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib2-1.0/library.json`
        );
        const deps = await storage.getDependentsCount({
            machineName: 'Lib2',
            majorVersion: 1,
            minorVersion: 0
        });
        expect(deps).toEqual(1);
    });

    it('returns the correct number of dependent libraries', async () => {
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib1-1.0/library.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib2-1.0/library.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib3-1.0/library.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib4-1.0/library.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/library-dependency/Lib5-1.0/library.json`
        );

        const deps = await storage.getAllDependentsCount();
        expect(deps).toMatchObject({
            'Lib1-1.0': 1,
            'Lib2-1.0': 1,
            'Lib3-1.0': 1,
            'Lib4-1.0': 1,
            'Lib5-1.0': 2
        });
    });

    it('saves and reads files', async () => {
        // Prepare
        const fileOnDisk = path.resolve(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/semantics.json`
        );
        await installMetadata(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await expect(
            storage.fileExists(example1Name, 'semantics.json')
        ).resolves.toEqual(false);

        // Action
        await storage.addFile(
            example1Name,
            'semantics.json',
            fsExtra.createReadStream(fileOnDisk)
        );
        await storage.addFile(
            example1Name,
            'language/.en.json',
            fsExtra.createReadStream(
                `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/language/.en.json`
            )
        );

        // Check
        await expect(
            storage.fileExists(example1Name, 'semantics.json')
        ).resolves.toEqual(true);
        await expect(
            storage.getFileAsString(example1Name, 'semantics.json')
        ).resolves.toEqual(await fsExtra.readFile(fileOnDisk, 'utf8'));
        await expect(
            storage.getFileAsJson(example1Name, 'semantics.json')
        ).resolves.toEqual(await fsExtra.readJSON(fileOnDisk));
        const realStats = await fsExtra.stat(fileOnDisk);
        await expect(
            storage.getFileStats(example1Name, 'semantics.json')
        ).resolves.toMatchObject({ size: realStats.size });
        await expect(storage.listFiles(example1Name)).resolves.toMatchObject([
            'language/.en.json',
            'semantics.json',
            'library.json'
        ]);
    });

    it('returns the correct list of languages', async () => {
        // Prepare
        await installMetadata(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );

        // Action
        await storage.addFile(
            example1Name,
            'language/.en.json',
            fsExtra.createReadStream(
                `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/language/.en.json`
            )
        );
        await storage.addFile(
            example1Name,
            'language/de.json',
            fsExtra.createReadStream(
                `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/language/de.json`
            )
        );

        // Check
        await expect(storage.getLanguages(example1Name)).resolves.toMatchObject(
            ['.en', 'de']
        );
    });

    it('clears files', async () => {
        // Prepare
        const fileOnDisk = `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/semantics.json`;
        await installMetadata(
            `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/library.json`
        );
        await storage.addFile(
            example1Name,
            'semantics.json',
            fsExtra.createReadStream(fileOnDisk)
        );
        await storage.addFile(
            example1Name,
            'language/.en.json',
            fsExtra.createReadStream(
                `${__dirname}/../../../test/data/libraries/H5P.Example1-1.1/language/.en.json`
            )
        );

        // Action
        await storage.clearFiles(example1Name);

        // Check
        await expect(
            storage.fileExists(example1Name, 'semantics.json')
        ).resolves.toEqual(false);
        await expect(
            storage.fileExists(example1Name, 'language/.en.json')
        ).resolves.toEqual(false);
    });
});
