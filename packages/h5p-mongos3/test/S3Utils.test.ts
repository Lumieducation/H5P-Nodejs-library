import { sanitizeFilename } from '../src/S3Utils';

describe('S3Utils', () => {
    describe('sanitizeFilename', () => {
        it('should leave valid filenames intact', () => {
            const sanitizedName1 = sanitizeFilename('images/file.jpg', 255);
            expect(sanitizedName1).toEqual('images/file.jpg');

            const sanitizedName2 = sanitizeFilename('file.any', 255);
            expect(sanitizedName2).toEqual('file.any');

            const sanitizedName3 = sanitizeFilename('file.any.jpg', 255);
            expect(sanitizedName3).toEqual('file.any.jpg');
        });

        it('should remove invalid characters', () => {
            const sanitizedName = sanitizeFilename(
                'i§$mages/äÜß`fileäüöä.j#pg*',
                255
            );
            expect(sanitizedName).toEqual('images/file.jpg');
        });

        it('should add a generic filename if all characters in a filename are invalid', () => {
            const sanitizedName = sanitizeFilename(
                'images/中文的名字.jpg',
                255
            );
            expect(sanitizedName).toEqual('images/file.jpg');
        });

        it('should work even if all characters are invalid', () => {
            const sanitizedName = sanitizeFilename(
                'images/中文的名字.中文',
                255
            );
            expect(sanitizedName).toEqual('images/file.');
        });

        it('should shorten long filenames', () => {
            const sanitizedName = sanitizeFilename(
                'images/aVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryVeryLongFilename.jpg',
                24
            );
            expect(sanitizedName).toEqual('images/aVeryVeryVery.jpg');
        });
    });
});
