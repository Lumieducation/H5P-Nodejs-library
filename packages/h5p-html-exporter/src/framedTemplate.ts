import { IIntegration } from '@lumieducation/h5p-server';

export default (
    integration: IIntegration,
    scriptsBundle: string,
    stylesBundle: string,
    contentId: string
): string => `
<!doctype html>
    <html class="h5p-iframe">
    <head>
        <meta charset="utf-8">                    
        <script>H5PIntegration = ${JSON.stringify({
            ...integration,
            baseUrl: '.',
            url: '.',
            ajax: { setFinished: '', contentUserData: '' },
            saveFreq: false,
            libraryUrl: ''
        })};

        if (new URLSearchParams(window.location.search).get('embed') == 'true') {
            H5PIntegration.contents['cid-' + '${contentId}'].displayOptions.embed = false;
        } else {
            H5PIntegration.contents['cid-' + '${contentId}'].embedCode = '<iframe src=\"' + window.location.protocol + "//" + window.location.host + window.location.pathname + '?embed=true' + '\" width=\":w\" height=\":h\" frameborder=\"0\" allowfullscreen=\"allowfullscreen\"></iframe>';
            H5PIntegration.contents['cid-' + '${contentId}'].resizeCode = '';
        }
            
        ${scriptsBundle}</script>
        <style>${stylesBundle}</style>
    </head>
    <body>
        <div class="h5p-content lag" data-content-id="${contentId}"></div>                
    </body>
</html>`;
