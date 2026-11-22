import { retireInstance } from '../src/h5p-utils';
import type { IH5P, IH5PInstance } from '../src/h5p-types';

function instance(state: unknown): IH5PInstance {
    return {
        contentId: '1',
        contentData: { metadata: {}, standalone: false },
        params: {},
        trigger: () => undefined,
        getCurrentState: () => state
    };
}

/**
 * What h5p.js does on each autosave tick and on unload: it saves the state of
 * every instance whose getCurrentState returns something.
 */
function saveLikeH5pJs(instances: IH5PInstance[]): unknown[] {
    return instances
        .map((i) => i.getCurrentState?.())
        .filter((state) => state !== undefined);
}

describe('retireInstance', () => {
    it('makes the instance report no state, so h5p.js saves nothing for it', () => {
        const retired = instance({ answers: [0] });

        retireInstance({ instances: [retired] } as IH5P, retired);

        expect(retired.getCurrentState()).toBeUndefined();
        expect(saveLikeH5pJs([retired])).toEqual([]);
    });

    it('removes the instance from H5P.instances and leaves the others alone', () => {
        const retired = instance({ answers: [0] });
        const other = instance({ answers: [1] });
        const h5pObject = { instances: [retired, other] } as IH5P;

        retireInstance(h5pObject, retired);

        expect(h5pObject.instances).toEqual([other]);
        expect(saveLikeH5pJs(h5pObject.instances)).toEqual([{ answers: [1] }]);
    });

    it('silences an instance that is no longer listed', () => {
        const retired = instance({ answers: [0] });

        retireInstance({ instances: [] } as IH5P, retired);

        expect(retired.getCurrentState()).toBeUndefined();
    });

    it('works without an H5P object, e.g. when the iframe is already gone', () => {
        const retired = instance({ answers: [0] });

        retireInstance(undefined, retired);

        expect(retired.getCurrentState()).toBeUndefined();
    });

    it('does nothing without an instance', () => {
        const h5pObject = { instances: [instance({})] } as IH5P;

        expect(() => retireInstance(h5pObject, undefined)).not.toThrow();
        expect(h5pObject.instances).toHaveLength(1);
    });
});
