import { customAlphabet } from 'nanoid';
import upath from 'upath';

import Logger from './Logger';
import H5pError from './H5pError';

const log = new Logger('FilenameGenerator');

const idCharacters =
    '1234567890abcdefghjiklmnoprstuvwxyABCDEFGHJIKLMNOPRSTUVWYXZ';
const nanoid = customAlphabet(idCharacters, 8);
const idRegex = new RegExp(`^[${idCharacters}]+$`);

/**
 * Generates a unique filename. Removes short-ids that were added to filenames
 * @param contentId the content object for which the file is about to be saved
 * @param filename the filename on which to base the unique filename on
 * @returns a unique filename (within the content object)
 */
export default async (
    filename: string,
    sanitize: (filename: string) => string,
    checkIfFileExists: (filename: string) => Promise<boolean>
): Promise<string> => {
    log.debug(`Getting unique name for ${filename}.`);
    let actualFilename = filename;
    // remove already assigned shortids
    const match = filename.match(/^(.+?)-([^/]+?)(\.\w+)$/);
    if (match && idRegex.test(match[2])) {
        actualFilename = match[1] + match[3];
        log.debug(`Actual filename is ${actualFilename}.`);
    }

    // try newly generated filenames
    let attempts = 0;
    let filenameAttempt = '';
    let exists = false;
    actualFilename = sanitize(actualFilename);
    const dirname = upath.dirname(actualFilename);
    do {
        filenameAttempt = `${
            dirname && dirname !== '.' ? `${dirname}/` : ''
        }${upath.basename(
            actualFilename,
            upath.extname(actualFilename)
        )}-${nanoid()}${upath.extname(actualFilename)}`;
        log.debug(`Checking if ${filenameAttempt} already exists`);
        exists = await checkIfFileExists(filenameAttempt);
        attempts += 1;
    } while (attempts < 5 && exists); // only try 5 times
    if (exists) {
        log.error(`Cannot determine a unique filename for ${filename}`);
        throw new H5pError(
            'error-generating-unique-content-filename',
            { filename },
            500
        );
    }
    log.debug(`Unique filename is ${filenameAttempt}`);
    return filenameAttempt;
};
