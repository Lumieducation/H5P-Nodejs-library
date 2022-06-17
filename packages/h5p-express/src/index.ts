import {
    IRequestWithLanguage,
    IRequestWithUser,
    IActionRequest
} from './expressTypes';
import h5pAjaxExpressRouter from './H5PAjaxRouter/H5PAjaxExpressRouter';
import libraryAdministrationExpressRouter from './LibraryAdministrationRouter/LibraryAdministrationExpressRouter';
import contentUserDataExpressRouter from './ContentUserDataRouter/ContentUserDataExpressRouter';
import contentTypeCacheExpressRouter from './ContentTypeCacheRouter/ContentTypeCacheExpressRouter';
import themeRouter from './ThemeRouter/ThemeExpressRouter';
import finishedDataExpressRouter from './FinishedDataRouter/FinishedDataExpressRouter';

export {
    IRequestWithLanguage,
    IRequestWithUser,
    IActionRequest,
    contentTypeCacheExpressRouter,
    contentUserDataExpressRouter,
    finishedDataExpressRouter,
    h5pAjaxExpressRouter,
    libraryAdministrationExpressRouter,
    themeRouter
};
