import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const hubData = JSON.parse(
    readFileSync(
        path.resolve(
            path.join(
                __dirname,
                '../../../test/data/content-type-cache/real-content-types.json'
            )
        ),
        'utf-8'
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

writeFileSync(
    path.resolve(path.join(__dirname, '../assets/translations/hub/en.json')),
    JSON.stringify(reducedHubData, undefined, 4)
);
