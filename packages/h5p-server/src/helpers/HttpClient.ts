import axios, { AxiosInstance } from 'axios';
// We need to use https-proxy-agent as the default Axios proxy functionality
// doesn't work with https.
import HttpsProxyAgent from 'https-proxy-agent';
import { IH5PConfig } from '../types';

/**
 * Creates an Axios instance that supports corporate HTTPS proxies.
 * The proxy can either be configured in the config's proxy property or by
 * setting the environment variable HTTPS_PROXY.
 * @param config the H5P config object
 * @returns the AxiosInstance
 */
const getClient = (config: IH5PConfig): AxiosInstance => {
    let proxyAgent;

    if (config.proxy) {
        proxyAgent = HttpsProxyAgent({
            host: config.proxy.host,
            port: config.proxy.port,
            protocol: config.proxy.protocol === 'https' ? 'https:' : undefined
        });
    } else if (process.env.HTTPS_PROXY) {
        proxyAgent = HttpsProxyAgent(process.env.HTTPS_PROXY);
    }

    return axios.create({
        proxy: proxyAgent ? false : undefined,
        httpsAgent: proxyAgent
    });
};

export default getClient;
