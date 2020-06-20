export default class ContentTypeCacheService {
    constructor(private baseUrl: string) {}

    public async getCacheUpdate(): Promise<Date> {
        const response = await fetch(`${this.baseUrl}/update`);
        if (response.ok) {
            const lastUpdate = (await response.json()).lastUpdate;
            return lastUpdate === null ? null : new Date(lastUpdate);
        }
        throw new Error(
            `Could not get content type cache update date: ${response.status} - ${response.statusText}`
        );
    }

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
