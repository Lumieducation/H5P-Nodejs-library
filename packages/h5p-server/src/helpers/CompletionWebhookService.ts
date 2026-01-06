import axios, { AxiosError } from 'axios';
import Logger from './Logger';

const log = new Logger('CompletionWebhookService');

export interface ICompletionWebhookData {
    contentId: string;
    userId: string;
    score: number;
    maxScore: number;
    openedTimestamp: number;
    finishedTimestamp: number;
    completionTime: number;
}

/**
 * Service for calling completion webhooks when users finish H5P content.
 * This service forwards completion data to an external webhook URL with
 * cookies from the original request to maintain authentication context.
 */
export default class CompletionWebhookService {
    /**
     * Calls the webhook URL with completion data and cookies from the request.
     * @param webhookUrl The URL to call
     * @param data The completion data to send
     * @param cookies Cookie string from the Express request (req.headers.cookie)
     * @returns Promise that resolves when webhook call completes (or fails silently)
     */
    public static async callWebhook(
        webhookUrl: string,
        data: ICompletionWebhookData,
        cookies?: string
    ): Promise<void> {
        try {
            log.debug(
                `Calling completion webhook at ${webhookUrl} for contentId ${data.contentId}, userId ${data.userId}`
            );

            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            // Forward cookies from the original request
            if (cookies) {
                headers['Cookie'] = cookies;
            }

            await axios.post(webhookUrl, data, {
                headers,
                // Set a reasonable timeout (5 seconds)
                timeout: 5000,
                // Don't throw on HTTP error status codes, we'll handle them
                validateStatus: () => true,
                // Forward cookies by setting maxRedirects to 0 (prevents redirects that might drop cookies)
                maxRedirects: 0
            });

            log.debug(
                `Successfully called completion webhook for contentId ${data.contentId}`
            );
        } catch (error) {
            // Log error but don't throw - webhook failures shouldn't break the main flow
            const axiosError = error as AxiosError;
            if (axiosError.code === 'ECONNABORTED') {
                log.warn(
                    `Completion webhook timeout for contentId ${data.contentId}: ${webhookUrl}`
                );
            } else if (axiosError.response) {
                log.warn(
                    `Completion webhook returned error status ${axiosError.response.status} for contentId ${data.contentId}: ${webhookUrl}`
                );
            } else {
                log.error(
                    `Error calling completion webhook for contentId ${data.contentId}: ${axiosError.message}`
                );
            }
        }
    }
}
