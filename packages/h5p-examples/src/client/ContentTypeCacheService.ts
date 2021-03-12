/**
 * This service performs queries at the REST endpoint of the content type cache.
 */
export default class ContentTypeCacheService {
    constructor(private baseUrl: string) {}

    /**
     * Gets the last update date and time.
     */
    public async getCacheUpdate(): Promise<Date> {
        const response = await fetch(`${this.baseUrl}/update`);
        if (response.ok) {
            const { lastUpdate } = await response.json();
            return lastUpdate === null ? null : new Date(lastUpdate);
        }
        throw new Error(
            `Could not get content type cache update date: ${response.status} - ${response.statusText}`
        );
    }

    /**
     * Triggers a content type cache update that will contact the H5P Hub and
     * retrieve the latest content type list.
     */
    public async postUpdateCache(): Promise<Date> {
        const response = await fetch(`${this.baseUrl}/update`, {
            method: 'POST'
        });
        if (response.ok) {
            return new Date((await response.json()).lastUpdate);
        }
        throw new Error(
            `Could not update content type cache: ${response.status} - ${response.statusText}`
        );
    }
}
