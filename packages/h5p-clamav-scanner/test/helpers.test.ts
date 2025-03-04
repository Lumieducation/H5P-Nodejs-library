import { removeUndefinedAttributesAndEmptyObjects } from '../src/helpers';

describe('removeUndefinedAttributes', () => {
    it('should remove attributes with undefined values', () => {
        const input = { a: 1, b: undefined, c: 'test', d: undefined };
        const expectedOutput = { a: 1, c: 'test' };
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });

    it('should return an empty object if all attributes are undefined', () => {
        const input = { a: undefined, b: undefined };
        const expectedOutput = {};
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });

    it('should return the same object if no attributes are undefined', () => {
        const input = { a: 1, b: 'test', c: true };
        const expectedOutput = { a: 1, b: 'test', c: true };
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });

    it('should handle an empty object', () => {
        const input = {};
        const expectedOutput = {};
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });

    it('should not remove attributes with null values', () => {
        const input = { a: null, b: 2, c: undefined };
        const expectedOutput = { a: null, b: 2 };
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });
    it('should remove empty nested objects', () => {
        const input = {
            a: 1,
            b: {},
            c: { d: undefined },
            e: { f: { g: undefined } }
        };
        const expectedOutput = { a: 1 };
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });

    it('should remove empty nested arrays', () => {
        const input = { a: 1, b: [], c: [undefined], d: [1, undefined, 2] };
        const expectedOutput = { a: 1, d: [1, undefined, 2] };
        expect(removeUndefinedAttributesAndEmptyObjects(input)).toEqual(
            expectedOutput
        );
    });
});
