import { Readable } from 'stream';
import { Cache, caching } from 'cache-manager';

import {
    ILibraryStorage,
    ILibraryName,
    ILibraryMetadata,
    IInstalledLibrary,
    IFileStats,
    IAdditionalLibraryMetadata
} from '../../types';
import LibraryName from '../../LibraryName';
import InstalledLibrary from '../../InstalledLibrary';

/**
 * A wrapper around an actual library storage which adds caching and also
 * handles cache invalidation for you. You can use this method as a drop-in
 * replacement for other library storages.
 *
 * It uses [the NPM package
 * `cache-manager`](https://www.npmjs.com/package/cache-manager) to abstract the
 * caching, so you can pass in any of the store engines supported by it (e.g.
 * redis, mongodb, fs, memcached). See the documentation page of `cache-manager`
 * for more details.
 *
 * Note: If you construct `CachedLibraryStorage` without a cache, it will
 * default to an in-memory cache that **is not suitable for multi-process or
 * multi-machine setups**!
 */
export default class CachedLibraryStorage implements ILibraryStorage {
    /**
     * @param storage the uncached storage behind the cache
     * @param cache the cache to use; if undefined an in-memory cache will be
     * used; **IMPORTANT: The default in-memory cache does not with
     * multi-process or multi-machine setups!**
     */
    constructor(protected storage: ILibraryStorage, protected cache?: Cache) {
        if (!this.cache) {
            this.cache = caching({
                store: 'memory',
                ttl: 60 * 60 * 24,
                max: 2 ** 10
            });
        }
    }

    private readonly ADDONS_CACHE_KEY: string = 'addons';
    private readonly FILE_EXISTS_CACHE_KEY: string = 'exists';
    private readonly FILE_LIST: string = 'files';
    private readonly INSTALLED_LIBRARY_NAMES_CACHE_KEY: string =
        'installed-library-names';
    private readonly JSON_CACHE_KEY: string = 'json';
    private readonly LANGUAGES_CACHE_KEY: string = 'languages';
    private readonly LIBRARY_IS_INSTALLED_CACHE_KEY: string = 'is-installed';
    private readonly METADATA_CACHE_KEY: string = 'metadata';
    private readonly STATS_CACHE_KEY: string = 'stats';
    private readonly STRING_CACHE_KEY: string = 'string';

    public async addFile(
        library: ILibraryName,
        filename: string,
        readStream: Readable
    ): Promise<boolean> {
        const result = await this.storage.addFile(
            library,
            filename,
            readStream
        );
        await this.deleteFileCache(library, filename);
        return result;
    }

    public async addLibrary(
        libraryData: ILibraryMetadata,
        restricted: boolean
    ): Promise<IInstalledLibrary> {
        const result = this.storage.addLibrary(libraryData, restricted);
        await this.cache.del(this.INSTALLED_LIBRARY_NAMES_CACHE_KEY);
        await this.cache.del(this.ADDONS_CACHE_KEY);
        await this.cache.del(
            this.getCacheKeyForMetadata(
                libraryData,
                this.LIBRARY_IS_INSTALLED_CACHE_KEY
            )
        );
        await this.cache.del(
            this.getCacheKeyForLibraryListByMachineName(libraryData.machineName)
        );
        await this.cache.del(
            this.getCacheKeyForMetadata(libraryData, this.FILE_LIST)
        );
        return result;
    }

    /**
     * Invalidates the whole cache.
     */
    public async clearCache(): Promise<void> {
        return this.cache.reset();
    }

    public async clearFiles(library: ILibraryName): Promise<void> {
        const files = await this.storage.listFiles(library);
        await this.storage.clearFiles(library);
        await this.cache.del(
            this.getCacheKeyForMetadata(library, this.FILE_LIST)
        );
        await Promise.all(
            files.map((file) => this.deleteFileCache(library, file))
        );
    }

    public async deleteLibrary(library: ILibraryName): Promise<void> {
        const files = await this.storage.listFiles(library);
        await this.storage.deleteLibrary(library);
        await Promise.all(
            files
                .map((file) => this.deleteFileCache(library, file))
                .concat([
                    this.cache.del(
                        this.getCacheKeyForMetadata(
                            library,
                            this.METADATA_CACHE_KEY
                        )
                    ),
                    this.cache.del(
                        this.getCacheKeyForMetadata(
                            library,
                            this.LANGUAGES_CACHE_KEY
                        )
                    ),
                    this.cache.del(
                        this.getCacheKeyForMetadata(
                            library,
                            this.LIBRARY_IS_INSTALLED_CACHE_KEY
                        )
                    ),
                    this.cache.del(this.INSTALLED_LIBRARY_NAMES_CACHE_KEY),
                    this.cache.del(
                        this.getCacheKeyForLibraryListByMachineName(
                            library.machineName
                        )
                    ),
                    this.cache.del(this.ADDONS_CACHE_KEY),
                    this.cache.del(
                        this.getCacheKeyForMetadata(library, this.FILE_LIST)
                    )
                ])
        );
    }

    public async fileExists(
        library: ILibraryName,
        filename: string
    ): Promise<boolean> {
        return this.cache.wrap(
            this.getCacheKeyForFile(
                library,
                filename,
                this.FILE_EXISTS_CACHE_KEY
            ),
            () => this.storage.fileExists(library, filename)
        );
    }

    /**
     * Not cached as the function will be called only very rarely.
     */
    public async getAllDependentsCount(): Promise<{
        [ubername: string]: number;
    }> {
        return this.storage.getAllDependentsCount();
    }

    /**
     * Not cached as the function will be called only very rarely.
     */
    public async getDependentsCount(library: ILibraryName): Promise<number> {
        return this.storage.getDependentsCount(library);
    }

    public async getFileAsJson(
        library: ILibraryName,
        file: string
    ): Promise<any> {
        return this.cache.wrap(
            this.getCacheKeyForFile(library, file, this.JSON_CACHE_KEY),
            () => this.storage.getFileAsJson(library, file)
        );
    }

    public async getFileAsString(
        library: ILibraryName,
        file: string
    ): Promise<string> {
        return this.cache.wrap(
            this.getCacheKeyForFile(library, file, this.STRING_CACHE_KEY),
            () => this.storage.getFileAsString(library, file)
        );
    }

    public async getFileStats(
        library: ILibraryName,
        file: string
    ): Promise<IFileStats> {
        return this.cache.wrap(
            this.getCacheKeyForFile(library, file, this.STATS_CACHE_KEY),
            () => this.storage.getFileStats(library, file)
        );
    }

    /**
     * We don't cache file streams, as this doesn't make much sense. A better
     * way to improve performance of files requested individually by the client
     * is to serve them statically, i.e. directly via Express or by offloading
     * them to S3 storage or a CDN.
     */
    public async getFileStream(
        library: ILibraryName,
        file: string
    ): Promise<Readable> {
        return this.storage.getFileStream(library, file);
    }

    public async getInstalledLibraryNames(
        machineName?: string
    ): Promise<ILibraryName[]> {
        if (machineName) {
            return this.cache.wrap(
                this.getCacheKeyForLibraryListByMachineName(machineName),
                () => this.storage.getInstalledLibraryNames(machineName)
            );
        }

        return this.cache.wrap(this.INSTALLED_LIBRARY_NAMES_CACHE_KEY, () =>
            this.storage.getInstalledLibraryNames()
        );
    }

    public async getLanguages(library: ILibraryName): Promise<string[]> {
        return this.cache.wrap(
            this.getCacheKeyForMetadata(library, this.LANGUAGES_CACHE_KEY),
            () => this.storage.getLanguages(library)
        );
    }

    public async getLibrary(library: ILibraryName): Promise<IInstalledLibrary> {
        const result: IInstalledLibrary = await this.cache.wrap(
            this.getCacheKeyForMetadata(library, this.METADATA_CACHE_KEY),
            () => this.storage.getLibrary(library)
        );
        // The ILibraryInterface contains methods, so we must construct an
        // object with these methods if we obtained the data from the cache.
        if (!result.compare) {
            return InstalledLibrary.fromMetadata(result);
        }
        return result;
    }

    public async isInstalled(library: ILibraryName): Promise<boolean> {
        return this.cache.wrap(
            this.getCacheKeyForMetadata(
                library,
                this.LIBRARY_IS_INSTALLED_CACHE_KEY
            ),
            () => this.storage.isInstalled(library)
        );
    }

    public async listAddons?(): Promise<ILibraryMetadata[]> {
        if (this.storage.listAddons) {
            return this.cache.wrap(this.ADDONS_CACHE_KEY, () =>
                this.storage.listAddons()
            );
        }
        return [];
    }

    public async listFiles(library: ILibraryName): Promise<string[]> {
        return this.cache.wrap(
            this.getCacheKeyForMetadata(library, this.FILE_LIST),
            () => this.storage.listFiles(library)
        );
    }

    public async updateAdditionalMetadata(
        library: ILibraryName,
        additionalMetadata: Partial<IAdditionalLibraryMetadata>
    ): Promise<boolean> {
        const result = await this.storage.updateAdditionalMetadata(
            library,
            additionalMetadata
        );
        await this.cache.del(
            this.getCacheKeyForMetadata(library, this.METADATA_CACHE_KEY)
        );
        return result;
    }

    public async updateLibrary(
        libraryMetadata: ILibraryMetadata
    ): Promise<IInstalledLibrary> {
        const result = await this.storage.updateLibrary(libraryMetadata);
        await this.cache.del(
            this.getCacheKeyForMetadata(
                libraryMetadata,
                this.METADATA_CACHE_KEY
            )
        );
        await this.cache.del(this.INSTALLED_LIBRARY_NAMES_CACHE_KEY);
        await this.cache.del(this.ADDONS_CACHE_KEY);
        await this.cache.del(
            this.getCacheKeyForLibraryListByMachineName(
                libraryMetadata.machineName
            )
        );
        return result;
    }

    private async deleteFileCache(
        library: ILibraryName,
        filename: string
    ): Promise<void> {
        await Promise.all([
            this.cache.del(
                this.getCacheKeyForFile(library, filename, this.JSON_CACHE_KEY)
            ),
            this.cache.del(
                this.getCacheKeyForFile(
                    library,
                    filename,
                    this.STRING_CACHE_KEY
                )
            ),
            this.cache.del(
                this.getCacheKeyForFile(
                    library,
                    filename,
                    this.FILE_EXISTS_CACHE_KEY
                )
            ),
            this.cache.del(
                this.getCacheKeyForFile(library, filename, this.STATS_CACHE_KEY)
            )
        ]);
    }

    private getCacheKeyForFile(
        library: ILibraryName,
        filename: string,
        usage: string
    ): string {
        return `${LibraryName.toUberName(library)}/${filename}-${usage}`;
    }

    private getCacheKeyForLibraryListByMachineName(
        machineName: string
    ): string {
        return `${this.INSTALLED_LIBRARY_NAMES_CACHE_KEY}-${machineName}`;
    }

    private getCacheKeyForMetadata(
        library: ILibraryName,
        usage: string
    ): string {
        return `${LibraryName.toUberName(library)}-${usage}`;
    }
}
