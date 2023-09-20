import { IH5PConfig, IKeyValueStorage } from '../types';

/**
 * Stores configuration options and literals that are used throughout the
 * system. Also loads and saves the configuration of changeable values (only
 * those as "user-configurable") in the storage object.
 */
export default class H5PConfig implements IH5PConfig {
    /**
     * @param storage A key-value storage object that persists the changes to
     * the disk or gets them from the implementation/plugin
     * @param defaults default values to use instead of the ones set by this
     * class
     */
    constructor(storage?: IKeyValueStorage, defaults?: Partial<IH5PConfig>) {
        this.storage = storage;
        if (defaults) {
            for (const key in defaults) {
                if (this[key] !== undefined) {
                    this[key] = defaults[key];
                }
            }
        }
    }
    public ajaxUrl: string = '/ajax';
    public baseUrl: string = '/h5p';
    public contentFilesUrl: string = '/content';
    public contentFilesUrlPlayerOverride: string;
    public contentTypeCacheRefreshInterval: number = 1 * 1000 * 60 * 60 * 24;
    public contentHubEnabled: boolean = false;
    public contentHubMetadataRefreshInterval: number = 1 * 1000 * 60 * 60 * 24;
    public contentUserDataUrl: string = '/contentUserData';
    public contentWhitelist: string =
        'json png jpg jpeg gif bmp tif tiff svg eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile vtt webvtt gltf glb';
    public coreApiVersion: { major: number; minor: number } = {
        major: 1,
        minor: 24
    };
    public coreUrl: string = '/core';
    public customization: {
        global: {
            editor?: {
                scripts?: string[];
                styles?: string[];
            };
            player?: {
                scripts?: string[];
                styles?: string[];
            };
        };
    } = {
        global: {
            editor: {
                scripts: [],
                styles: []
            },
            player: {
                scripts: [],
                styles: []
            }
        }
    };
    public disableFullscreen: boolean = false;
    public downloadUrl: string = '/download';
    public editorAddons?: {
        [machineName: string]: string[];
    };
    public editorLibraryUrl: string = '/editor';
    public enableLrsContentTypes: boolean = true;
    public exportMaxContentPathLength: number = 255;
    public fetchingDisabled: 0 | 1 = 0;
    public h5pVersion: string = '1.24-master';
    public hubContentTypesEndpoint: string =
        'https://api.h5p.org/v1/content-types/';
    public hubRegistrationEndpoint: string = 'https://api.h5p.org/v1/sites';
    public installLibraryLockMaxOccupationTime: number = 10000;
    public installLibraryLockTimeout: number = 20000;
    public contentHubContentEndpoint: string =
        'https://hub-api.h5p.org/v1/contents';
    public contentHubMetadataEndpoint: string =
        'https://hub-api.h5p.org/v1/metadata';
    public librariesUrl: string = '/libraries';
    public libraryConfig: { [machineName: string]: any };
    public libraryWhitelist: string = 'js css';
    public lrsContentTypes: string[] = [
        'H5P.Questionnaire',
        'H5P.FreeTextQuestion'
    ];
    public maxFileSize: number = 16 * 1024 * 1024;
    public maxTotalSize: number = 64 * 1024 * 1024;
    public paramsUrl: string = '/params';
    public platformName: string = 'H5P-Editor-NodeJs';
    public platformVersion: string = '0.10';
    public playerAddons?: {
        [machineName: string]: string[];
    };
    public playUrl: string = '/play';
    public proxy?: {
        host: string;
        port: number;
        protocol?: 'http' | 'https';
    };
    public sendUsageStatistics: boolean = false;
    public setFinishedUrl: string = '/finishedData';
    public setFinishedEnabled: boolean = true;
    public siteType: 'local' | 'network' | 'internet' = 'local';
    public contentUserStateSaveInterval: number | false = 5 * 1000; // the interval to save the contentUserData in milliseconds
    public temporaryFileLifetime: number = 120 * 60 * 1000; // 120 minutes
    public temporaryFilesUrl: string = '/temp-files';
    public uuid: string = '';

    private storage: IKeyValueStorage;

    /**
     * Loads all changeable settings from storage. (Should be called when the system initializes.)
     */
    public async load(): Promise<H5PConfig> {
        await this.loadSettingFromStorage('baseUrl');
        await this.loadSettingFromStorage('contentFilesUrlPlayerOverride');
        await this.loadSettingFromStorage('contentHubEnabled');
        await this.loadSettingFromStorage('contentHubMetadataRefreshInterval');
        await this.loadSettingFromStorage('contentTypeCacheRefreshInterval');
        await this.loadSettingFromStorage('contentUserStateSaveInterval');
        await this.loadSettingFromStorage('contentWhitelist');
        await this.loadSettingFromStorage('customization');
        await this.loadSettingFromStorage('disableFullscreen');
        await this.loadSettingFromStorage('editorAddons');
        await this.loadSettingFromStorage('enableLrsContentTypes');
        await this.loadSettingFromStorage('exportMaxContentPathLength');
        await this.loadSettingFromStorage('fetchingDisabled');
        await this.loadSettingFromStorage('hubContentTypesEndpoint');
        await this.loadSettingFromStorage('hubRegistrationEndpoint');
        await this.loadSettingFromStorage('libraryConfig');
        await this.loadSettingFromStorage('libraryWhitelist');
        await this.loadSettingFromStorage('maxFileSize');
        await this.loadSettingFromStorage('maxTotalSize');
        await this.loadSettingFromStorage('playerAddons');
        await this.loadSettingFromStorage('proxy');
        await this.loadSettingFromStorage('sendUsageStatistics');
        await this.loadSettingFromStorage('setFinishedEnabled');
        await this.loadSettingFromStorage('siteType');
        await this.loadSettingFromStorage('uuid');
        return this;
    }

    /**
     * Saves all changeable settings to storage. (Should be called when a setting was changed.)
     */
    public async save(): Promise<void> {
        await this.saveSettingToStorage('contentFilesUrlPlayerOverride');
        await this.saveSettingToStorage('contentHubEnabled');
        await this.saveSettingToStorage('contentHubMetadataRefreshInterval');
        await this.saveSettingToStorage('contentTypeCacheRefreshInterval');
        await this.saveSettingToStorage('contentUserStateSaveInterval');
        await this.saveSettingToStorage('contentWhitelist');
        await this.saveSettingToStorage('customization');
        await this.saveSettingToStorage('disableFullscreen');
        await this.saveSettingToStorage('editorAddons');
        await this.saveSettingToStorage('enableLrsContentTypes');
        await this.saveSettingToStorage('exportMaxContentPathLength');
        await this.saveSettingToStorage('fetchingDisabled');
        await this.saveSettingToStorage('hubContentTypesEndpoint');
        await this.saveSettingToStorage('hubRegistrationEndpoint');
        await this.saveSettingToStorage('libraryConfig');
        await this.saveSettingToStorage('libraryWhitelist');
        await this.saveSettingToStorage('maxFileSize');
        await this.saveSettingToStorage('maxTotalSize');
        await this.saveSettingToStorage('playerAddons');
        await this.saveSettingToStorage('proxy');
        await this.saveSettingToStorage('sendUsageStatistics');
        await this.saveSettingToStorage('setFinishedEnabled');
        await this.saveSettingToStorage('siteType');
        await this.saveSettingToStorage('uuid');
    }

    /**
     * Loads a settings from the storage interface. Uses the default value
     * configured in this file if there is none in the configuration.
     * @param settingName
     * @returns the value of the setting
     */
    private async loadSettingFromStorage(settingName: string): Promise<any> {
        this[settingName] =
            (await this.storage?.load(settingName)) ?? this[settingName];
        return this[settingName];
    }

    /**
     * Saves a setting to the storage interface.
     * @param settingName
     */
    private async saveSettingToStorage(settingName: string): Promise<void> {
        await this.storage?.save(settingName, this[settingName]);
    }
}
