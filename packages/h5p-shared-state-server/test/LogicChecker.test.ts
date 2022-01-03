import fsExtra from 'fs-extra';
import path from 'path';
import LogicChecker from '../src/LogicChecker';

describe('logic checker', () => {
    let params;
    let snapshot;

    const logicChecker = new LogicChecker();

    beforeEach(() => {
        params = fsExtra.readJSONSync(path.join(__dirname, 'data/params.jon'));
        snapshot = fsExtra.readJSONSync(
            path.join(__dirname, 'data/snapshot.jon')
        );
    });

    it('evaluates $eq', () => {
        expect(
            logicChecker.check(params, snapshot, [
                {
                    '$.params.options[*].id': {
                        $eq: {
                            $query: '$.snapshot.votes[*]~'
                        }
                    }
                }
            ])
        ).toEqual(true);
    });
});
