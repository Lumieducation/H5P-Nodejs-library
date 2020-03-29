import * as H5P from '../src';

export default function render(
    editor: H5P.H5PEditor
): (req: any, res: any) => any {
    return async (req, res) => {
        const contentIds = await editor.contentManager.listContent();
        const contentObjects = await Promise.all(
            contentIds.map(async (id) => ({
                content: await editor.contentManager.getContentMetadata(
                    id,
                    req.user
                ),
                id
            }))
        );
        res.send(`
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8">
            <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.css" crossorigin="anonymous">
            <title>H5P NodeJs Demo</title>
        </head>
        <body>
            <div class="container">
                <h1>H5P NodeJs Demo</h1>
                <div class="alert alert-warning">This demo is for debugging and demonstration purposes only and not suitable for production use!</div>
                <a class="btn btn-primary my-2" href="${
                    editor.config.baseUrl
                }/new"><span class="fa fa-plus-circle m-2"></span>Create new content</a>
                <h2>Existing content</h2>
                <div class="list-group">
                ${contentObjects
                    .map(
                        (content) =>
                            `<div class="list-group-item">
                                <div class="d-flex w-10">
                                    <div class="mr-auto p-2 align-self-center">
                                        <a href="${editor.config.baseUrl}${editor.config.playUrl}/${content.id}">
                                            <h5>${content.content.title}</h5>
                                        </a>
                                        <div class="small d-flex">                                            
                                            <div class="mr-2">
                                                <span class="fa fa-book-open"></span>
                                                ${content.content.mainLibrary}
                                            </div>
                                            <div class="mr-2">
                                                <span class="fa fa-fingerprint"></span>
                                                ${content.id}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="p-2">                                        
                                        <a class="btn btn-secondary" href="${editor.config.baseUrl}/edit/${content.id}">
                                            <span class="fa fa-pencil-alt m-1"></span>
                                            edit
                                        </a>
                                    </div>
                                    <div class="p-2">
                                        <a class="btn btn-info" href="${editor.config.baseUrl}${editor.config.downloadUrl}/${content.id}">
                                            <span class="fa fa-file-download m-1"></span>
                                            download
                                        </a>
                                    </div>
                                    <div class="p-2">
                                        <a class="btn btn-danger" href="${editor.config.baseUrl}/delete/${content.id}">
                                            <span class="fa fa-trash-alt m-1"></span>
                                            delete
                                        </a>
                                    </div>
                                </div>                                
                            </div>`
                    )
                    .join('')}
                </div>
            </div>
        </body>
        `);
    };
}
