import fsExtra from 'fs-extra';
import path from 'path';
import LogicChecker from '../src/LogicChecker';

describe('logic checker', () => {
    let params;
    let snapshot;

    const logicChecker = new LogicChecker();

    beforeEach(() => {
        params = fsExtra.readJSONSync(path.join(__dirname, 'data/params.json'));
        snapshot = fsExtra.readJSONSync(
            path.join(__dirname, 'data/snapshot.json')
        );
    });

    it('evaluates $eq', () => {
        expect(
            logicChecker.check(params, snapshot, [
                {
                    '$.params.options[*].id': {
                        $eq: {
                            $query: '$.data.votes[*]~'
                        }
                    }
                }
            ])
        ).toEqual(true);
    });
    it('evaluates implicit equality', () => {
        expect(
            logicChecker.check(params, snapshot, [
                {
                    '$.params.options[0].id': 'opt1'
                }
            ])
        ).toEqual(true);
        expect(
            logicChecker.check(params, snapshot, [
                {
                    '$.params.options[0].id': 'opt2'
                }
            ])
        ).toEqual(false);
    });
});
