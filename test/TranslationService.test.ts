import TranslationService from '../src/TranslationService';

describe('translation / localization service', () => {
    const fallbackLiterals = {
        key1: 'fallback1',
        key2: 'fallback2',
        key3: 'fallback3',
        key4: 'fallback4'
    };
    const localizedLiterals = {
        key1: 'local1',
        key2: 'local2 !variable1 local2 !variable2',
        key3: 'local2 %variable1 local2 %variable2',
        key5: 'local5',
        key6: 'local2 @variable1 local2 @variable2'
    };

    it('correctly returns translations', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(t.getTranslation('key1')).toBe(localizedLiterals.key1);
        expect(t.getTranslation('key5')).toBe(localizedLiterals.key5);
    });

    it('correctly returns fallback literals', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(t.getTranslation('key4')).toBe(fallbackLiterals.key4);
    });

    it('returns an empty string if there is no literal', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(t.getTranslation('key999')).toBe('');
    });

    it('replaces ! placeholders', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(
            t.getTranslation('key2', {
                '!variable1': 'test1',
                '!variable2': 'test2'
            })
        ).toBe('local2 test1 local2 test2');
    });

    it('replaces @ placeholders', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(
            t.getTranslation('key6', {
                '@variable1': 'A < B',
                '@variable2': 'C & A'
            })
        ).toBe('local2 A &lt; B local2 C &amp; A');
    });

    it('replaces % placeholders', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);
        expect(
            t.getTranslation('key3', {
                '%variable1': 'A < B',
                '%variable2': 'C & A'
            })
        ).toBe('local2 <em>A &lt; B</em> local2 <em>C &amp; A</em>');
    });

    it('throws an exception if placeholder keys are malformed', async () => {
        const t = new TranslationService(fallbackLiterals, localizedLiterals);

        expect(() => {
            t.getTranslation('key2', { key: 'value' });
        }).toThrow(Error);
    });
});
