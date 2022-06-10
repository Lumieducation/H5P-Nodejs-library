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

    it('evaluates $ne', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $ne: 'opt2'
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $ne: ['opt1', 'opt2', 'opt3', 'opt4']
                    }
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

        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $in: ['opt1', 'opt2', 'opt3', 'opt4']
                    }
                }
            ])
        ).toEqual(true);

        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $in: ['opt1', 'opt3', 'opt4']
                    }
                }
            ])
        ).toEqual(false);
    });

    it('evaluates $nin', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $nin: ['opt2', 'opt3']
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options[0].id': {
                        $nin: ['opt1', 'opt2', 'opt3']
                    }
                }
            ])
        ).toEqual(false);

        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $nin: ['opt4', 'opt5', 'opt6']
                    }
                }
            ])
        ).toEqual(true);

        expect(
            checkLogic(obj, [
                {
                    '$.params.options[*].id': {
                        $nin: ['opt1', 'opt5', 'opt6']
                    }
                }
            ])
        ).toEqual(false);

        expect(
            checkLogic({ array1: ['entry'], array2: ['entry'] }, [
                {
                    '$.array1': {
                        $nin: { $query: 'array2' }
                    }
                }
            ])
        ).toEqual(false);

        expect(
            checkLogic({ votesUp: ['teacher1'], votesDown: ['teacher1'] }, [
                {
                    '$.snapshot.votesUp': {
                        $nin: { $query: '$.snapshot.votesDown' }
                    }
                }
            ])
        ).toEqual(false);
    });

    it('evaluates $lt', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $lt: 10
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $lt: 1
                    }
                }
            ])
        ).toEqual(false);
        expect(
            checkLogic(obj, [
                {
                    '$.data.votes.opt2': {
                        $lt: 10
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $lte', () => {
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $lte: 10
                    }
                }
            ])
        ).toEqual(true);
        expect(
            checkLogic(obj, [
                {
                    '$.params.options.length': {
                        $lte: 3
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $and', () => {
        expect(
            checkLogic(obj, [
                {
                    $and: [
                        {
                            '$.params.options[0].id': { $eq: 'opt1' }
                        },
                        {
                            '$.params.options[1].id': { $eq: 'opt2' }
                        },
                        {
                            '$.params.options[2].id': { $ne: 'opt1' }
                        }
                    ]
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $or', () => {
        expect(
            checkLogic(obj, [
                {
                    $or: [
                        {
                            '$.params.options[0].id': { $eq: 'opt2' }
                        },
                        {
                            '$.params.options[0].id': { $eq: 'opt1' }
                        }
                    ]
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $nor', () => {
        expect(
            checkLogic(obj, [
                {
                    $nor: [
                        {
                            '$.params.options[0].id': { $eq: 'opt2' }
                        },
                        {
                            '$.params.options[0].id': { $eq: 'opt3' }
                        }
                    ]
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $not', () => {
        expect(
            checkLogic(obj, [
                {
                    $not: {
                        '$.params.options[0].id': { $eq: 'opt2' }
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates logical operator combinations 1', () => {
        expect(
            checkLogic(obj, [
                {
                    $not: {
                        $and: [
                            {
                                '$.params.options[0].id': { $eq: 'opt2' }
                            },
                            {
                                '$.params.options[0].id': { $eq: 'opt3' }
                            }
                        ]
                    }
                }
            ])
        ).toEqual(true);
    });

    it('evaluates logical operator combinations 2', () => {
        expect(
            checkLogic(obj, [
                {
                    $and: [
                        {
                            $or: [
                                {
                                    '$.params.options[0].id': { $eq: 'opt1' }
                                },
                                {
                                    '$.params.options[0].id': { $eq: 'opt0' }
                                }
                            ]
                        },
                        {
                            $or: [
                                {
                                    '$.params.options[1].id': { $eq: 'opt0' }
                                },
                                {
                                    '$.params.options[1].id': { $eq: 'opt2' }
                                }
                            ]
                        }
                    ]
                }
            ])
        ).toEqual(true);
    });

    it('evaluates $defined', () => {
        expect(checkLogic(obj, [{ $defined: { $query: '$.params' } }])).toEqual(
            true
        );
        expect(
            checkLogic(obj, [{ $defined: { $query: '$.nonexistant' } }])
        ).toEqual(false);
    });
});

describe('ops checker', () => {
    it('basic ops checker', () => {
        expect(
            checkLogic(
                {
                    op: [{ p: ['votesUp', 0], li: 'teacher1' }],
                    context: { user: { id: 'teacher1' } }
                },
                [
                    {
                        $or: [
                            {
                                $and: [
                                    {
                                        $or: [
                                            { '$.op[0].p': ['votesUp', 0] },
                                            { '$.op[0].p': ['votesDown', 0] }
                                        ]
                                    },
                                    {
                                        '$.op[0].li': {
                                            $query: '$.context.user.id'
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            )
        ).toEqual(true);
    });

    it('snapshot check 1', () => {
        expect(
            checkLogic(
                {
                    snapshot: {
                        answers: [],
                        scores: {},
                        users: { user1: 'User 1' },
                        phase: 'preparing',
                        currentQuestionNumber: 0,
                        currentQuestionStart: 0,
                        currentQuestionOrder: []
                    }
                },
                [
                    {
                        '$.snapshot.scores.*~': {
                            $in: {
                                $query: '$.snapshot.users.*~'
                            }
                        }
                    }
                ]
            )
        ).toEqual(true);
    });
});
