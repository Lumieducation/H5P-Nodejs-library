import fsExtra from 'fs-extra';
import path from 'path';

const hubData = fsExtra.readJSONSync(
    path.resolve(
        path.join(
            __dirname,
            '../../../test/data/content-type-cache/real-content-types.json'
        )
    )
);

const reducedHubData = hubData.contentTypes.reduce((prev, ct) => {
    prev[ct.id.replace('.', '_')] = {
        title: `${ct.title} (${ct.title})`,
        summary: ct.summary,
        description: ct.description,
        keywords: ct.keywords?.reduce((prev, curr) => {
            prev[curr.replace(' ', '_')] = curr;
            return prev;
        }, {})
    };
    return prev;
}, {});

fsExtra.writeJSONSync(
    path.resolve(path.join(__dirname, '../assets/translations/hub/en.json')),
    reducedHubData,
    {
        spaces: 4
    }
);
