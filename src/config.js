export default class H5PEditorConfig {
    constructor() {
        this.platform_name = 'H5P-Editor-NodeJs';
        this.platform_name = '0.0';
        this.h5p_version = '1.22';
        this.core_api_version = '1.19';

        /**
         * Unclear.
         */
        this.fetching_disabled = 0;

        /**
         * Used to identify the running instance when calling the H5P Hub.
         */
        this.uuid = '';

        /**
         * Unclear.
         */
        this.site_type = 'local';

        /**
         * If true, the instance will send usage statistics to the H5P Hub whenever it looks for new content types or updates.
         */
        this.send_usage_statistics = false;

        /**
         * Called to register the running instance at the H5P Hub.
         */
        this.hub_registration_endpoint = 'https://api.h5p.org/v1/sites';

        /**
         * Called to fetch information about the content types available at the H5P Hub.
         */
        this.hub_content_types_endpoint = 'https://api.h5p.org/v1/content-types/';
    }
}