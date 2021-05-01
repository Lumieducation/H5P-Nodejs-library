import axios from 'axios';

export default class ContentHub {
    getMetadata = async (): Promise<any> => {
        const response = await axios.get(
            'https://hub-api.h5p.org/v1/metadata?lang=en'
        );
        if (response.status === 200) {
            return response.data;
        }
        return {};
    };
}
