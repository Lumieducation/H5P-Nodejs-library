import {
    IRequestWithLanguage,
    IRequestWithUser,
    IRequestWithTranslator,
    IActionRequest
} from './expressTypes';
import h5pAjaxExpressRouter from './H5PAjaxRouter/H5PAjaxExpressRouter';
import libraryAdministrationExpressRouter from './LibraryAdministrationRouter/LibraryAdministrationExpressRouter';
import contentTypeCacheExpressRouter from './ContentTypeCacheRouter/ContentTypeCacheExpressRouter';

export {
    IRequestWithLanguage,
    IRequestWithUser,
    IRequestWithTranslator,
    IActionRequest,
    h5pAjaxExpressRouter,
    libraryAdministrationExpressRouter,
    contentTypeCacheExpressRouter
};
