import filenameGenerator from '../../src/helpers/FilenameGenerator';

describe('FilenameGenerator', () => {
    it('generates correct filenames', async () => {
        const newFilename = await filenameGenerator(
            'test.jpg',
            (str) => str,
            () => new Promise((res) => res(false))
        );
        expect(/^test-[0-9a-z]{8}\.jpg$/i.test(newFilename)).toEqual(true);
    });

    it('fixes name collisions', async () => {
        let isFirst = true;
        let firstTry = '';
        const newFilename = await filenameGenerator(
            'test.jpg',
            (str) => str,
            (f) =>
                new Promise((res) => {
                    if (isFirst) {
                        firstTry = f;
                        isFirst = false;
                        return res(true);
                    }
                    return res(false);
                })
        );
        expect(/^test-[0-9a-z]{8}\.jpg$/i.test(newFilename)).toEqual(true);
        expect(firstTry).not.toEqual(newFilename);
    });

    it('detects postfixes and replaces them', async () => {
        const newFilename = await filenameGenerator(
            'test-1234ABCD.jpg',
            (str) => str,
            () => new Promise((res) => res(false))
        );
        expect(/^test-[0-9a-z]{8}\.jpg$/i.test(newFilename)).toEqual(true);
    });

    it("doesn't append multiple postfixes", async () => {
        let filename = 'test-1234ABCD.jpg';
        for (let x = 0; x < 100; x++) {
            // eslint-disable-next-line no-await-in-loop
            filename = await filenameGenerator(
                filename,
                (str) => str,
                () => new Promise((res) => res(false))
            );
        }
        expect(/^test-[0-9a-z]{8}\.jpg$/i.test(filename)).toEqual(true);
    });
});
