import H5PEditor from './H5PEditor';
import H5PPlayer from './H5PPlayer';
import LibraryName from './LibraryName';
import PackageExporter from './PackageExporter';
import TranslationService from './TranslationService';

// tslint:disable-next-line: import-name
import englishStrings from './translations/en.json';

export default {
    LibraryName,
    PackageExporter,
    TranslationService,
    englishStrings,
    // tslint:disable-next-line: object-literal-sort-keys
    Editor: H5PEditor,
    Player: H5PPlayer
};
