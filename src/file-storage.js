const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

function readJson(file) {
    return new Promise((y, n) =>
        fs.readFile(file, 'utf8', (err, data) =>
            err ? n(err) : y(JSON.parse(data))))
}

class FileStorage {
    constructor(base) {
        this._base = base;
    }    

    saveH5P(contentId, h5pJson) {
        return new Promise(resolve => {
            mkdirp(this._contentFolder(contentId), () => {
                fs.writeFile(
                    `${this._contentFolder(contentId)}/h5p.json`,
                    JSON.stringify(h5pJson),
                    'utf8',
                    resolve
                );
            });
        });
    }

    loadH5PJson(contentId) {
        return readJson(`${this._contentFolder(contentId)}/h5p.json`);
    }

    loadContent(contentId) {
        return readJson(`${this._contentFolder(contentId)}/content/content.json`);
    }

    saveContent(contentId, content) {
        return new Promise(resolve => {
            const dir = `${this._contentFolder(contentId)}/content`;
            mkdirp(dir, () => {
                fs.writeFile(
                    `${dir}/content.json`,
                    JSON.stringify(content),
                    'utf8',
                    () => {
                        resolve();
                    }
                );
            });
        });
    }

    saveContentFile(id, filePath, stream) {
        const fullPath = `${this._contentFolder(id)}/${filePath}`;

        return new Promise(y => fs.mkdir(path.dirname(fullPath), { recursive: true }, y))
            .then(() => new Promise(y =>
                stream.pipe(fs.createWriteStream(fullPath))
                    .on('finish', y)))
    }

    _libraryFolder(name, maj, min) {
        return `${this._base}/libraries/${name}-${maj}.${min}`
    }

    _contentFolder(contentId) {
        return `${this._base}/content/${contentId}`
    }
}

module.exports = FileStorage;