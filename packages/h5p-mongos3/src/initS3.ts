import AWS from 'aws-sdk';

/**
 * Creates an S3 client.
 * @param options (optional) These options will be passed to the S3 client. You
 * can override options through these environment variables:
 * AWS_ACCESS_KEY_ID: string
 * AWS_SECRET_ACCESS_KEY: string
 * AWS_S3_ENDPOINT: string
 * AWS_REGION: string
 * @returns the S3 client
 */
export default (options?: AWS.S3.ClientConfiguration): AWS.S3 => {
    const optionsWithOverrides = { ...options } ?? {};

    // add overrides to configuration values that are set through environment
    // variables
    if (process.env.AWS_ACCESS_KEY_ID) {
        optionsWithOverrides.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    }
    if (process.env.AWS_SECRET_ACCESS_KEY) {
        optionsWithOverrides.secretAccessKey =
            process.env.AWS_SECRET_ACCESS_KEY;
    }
    if (process.env.AWS_S3_ENDPOINT) {
        optionsWithOverrides.endpoint = process.env.AWS_S3_ENDPOINT;
    }
    if (process.env.AWS_REGION) {
        optionsWithOverrides.region = process.env.AWS_REGION;
    }

    if (!optionsWithOverrides.accessKeyId) {
        throw new Error(
            'Access key for S3 storage missing. Either set the environment variable AWS_ACCESS_KEY_ID or pass the accessKeyId property through the option object.'
        );
    }

    if (!optionsWithOverrides.secretAccessKey) {
        throw new Error(
            'Secret access key for S3 storage missing. Either set the environment variable AWS_SECRET_ACCESS_KEY or pass the secretAccessKey property through the option object.'
        );
    }

    if (!optionsWithOverrides.endpoint && !optionsWithOverrides.region) {
        throw new Error(
            'No S3 endpoint or AWS region was specified. You must either set the environment variables AWS_S3_ENDPOINT or AWS_REGION or set the properties endpoint or region in the option object.'
        );
    }

    return new AWS.S3(optionsWithOverrides);
};
