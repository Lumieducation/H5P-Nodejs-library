import { checkLogic } from '../src/LogicChecker';

describe('logic checker', () => {
    const obj = {
        params: {
            options: [
                {
                    id: 'opt1',
                    text: 'Option 1'
                },
                {
                    id: 'opt2',
                    text: 'Option 2'
                },
                {
                    id: 'opt3',
                    text: 'Option 3'
                }
            ]
        },
        data: {
            votes: {
                opt1: 1,
                opt2: 2,
                opt3: 3
            }
        }
    };

    it('evaluates $eq', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $eq: {
                            $query: '$.data.votes[*]~'
                        }
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $eq: ['opt1', 'opt2', 'opt3']
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates implicit equality', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': 'opt1'
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': 'opt2'
                }
            ])
        ).toEqual(false);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': ['opt1', 'opt2', 'opt3']
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $neq', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].text': {
                        $ne: {
                            $query: '$.data.votes[*]~'
                        }
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $ne: 'opt2'
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $gt', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $gt: 1
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $gt: 5
                    }
                }
            ])
        ).toEqual(false);
        expect(
            checkLogic(obj, [
                {
                    '$.data.votes.opt2': {
                        $gt: 1
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $gte', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $gte: 3
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $gte: 4
                    }
                }
            ])
        ).toEqual(false);
    });

    it('evaluates $in', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $in: { $query: '$.data.votes[*]~' }
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $in: ['opt1', 'opt2', 'opt3']
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $in: ['opt2', 'opt3']
                    }
                }
            ])
        ).toEqual(false);
    });
});
