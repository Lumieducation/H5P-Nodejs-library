const puppeteer = require('puppeteer');
process.env.NODE_ENV = 'test';

const server = require('../examples/express');

server.listen(8080, () => {
    console.log(`server running on http://localhost: ${8080}`);
    puppeteer.launch({ devtools: true }).then(browser => {
        browser.newPage().then(page => {
            page.on('pageerror', msg => {
                console.log(`ERROR: ${msg}`);
                process.exit(1);
            });

            page.goto(`http://localhost:8080/`, {
                waitUntil: 'networkidle0'
            }).then(() => {
                page.waitFor(2000).then(() => {
                    for (const frame of page.mainFrame().childFrames()) {
                        frame.click('#h5p-coursepresentation');
                        setTimeout(() => {
                            process.exit(0);
                        }, 10000);
                    }
                });
            });
        });
    });
});
