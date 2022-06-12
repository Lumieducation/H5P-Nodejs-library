import { IEditorModel } from '../types';

export default (model: IEditorModel): string => `<html>
<head>
<meta charset="UTF-8">
<script> window.H5PIntegration = parent.H5PIntegration || ${JSON.stringify(
    model.integration,
    null,
    2
)}</script>
${model.styles
    .map((style) => `<link rel="stylesheet" href="${style}">`)
    .join('\n    ')}
${model.scripts
    .map((script) => `<script src="${script}"></script>`)
    .join('\n    ')}
</head>
<body>

<form method="post" enctype="multipart/form-data" id="h5p-content-form">
    <div id="post-body-content">
        <div class="h5p-create">
            <div class="h5p-editor"></div>
        </div>
    </div>
    <input id="save-h5p" type="submit" name="submit" value="Create" class="button button-primary button-large">
</form>
<script>
var ns = H5PEditor;

(function($) {
    H5PEditor.init = function() {
        H5PEditor.$ = H5P.jQuery;
        H5PEditor.basePath = H5PIntegration.editor.libraryUrl;
        H5PEditor.fileIcon = H5PIntegration.editor.fileIcon;
        H5PEditor.ajaxPath = H5PIntegration.editor.ajaxPath;
        H5PEditor.filesPath = H5PIntegration.editor.filesPath;
        H5PEditor.apiVersion = H5PIntegration.editor.apiVersion;
        H5PEditor.contentLanguage = H5PIntegration.editor.language;

        // Semantics describing what copyright information can be stored for media.
        H5PEditor.copyrightSemantics = H5PIntegration.editor.copyrightSemantics;
        H5PEditor.metadataSemantics = H5PIntegration.editor.metadataSemantics;

        // Required styles and scripts for the editor
        H5PEditor.assets = H5PIntegration.editor.assets;

        // Required for assets
        H5PEditor.baseUrl = '';

        if (H5PIntegration.editor.nodeVersionId !== undefined) {
            H5PEditor.contentId = H5PIntegration.editor.nodeVersionId;
        }

        var h5peditor;
        var $type = $('input[name="action"]');
        var $upload = $('.h5p-upload');
        var $create = $('.h5p-create').hide();
        var $editor = $('.h5p-editor');
        var $library = $('input[name="library"]');
        var $params = $('input[name="parameters"]');
        var library = $library.val();

        // $type.change(function () {
        //   if ($type.filter(':checked').val() === 'upload') {
        //     $create.hide();
        //     $upload.show();
        //   }
        //   else {
        $upload.hide();
        if (h5peditor === undefined) {
            if(H5PEditor.contentId){
                $.ajax({
                    error: function(res) {
                        h5peditor = new ns.Editor(undefined, undefined, $editor[0]);
                        $create.show();
                    },
                    success: function(res) {
                        h5peditor = new ns.Editor(
                            res.library,
                            JSON.stringify(res.params),
                            $editor[0]
                        );
                        $create.show();
                        // $type.change();
                    },
                    type: 'GET',
                    url: '${model.urlGenerator.parameters()}/' + H5PEditor.contentId + window.location.search
                });
            } else {
                h5peditor = new ns.Editor(undefined, undefined, $editor[0]);
                $create.show();
            }
        }
        $create.show();
        //   }
        // });

        if ($type.filter(':checked').val() === 'upload') {
            $type.change();
        } else {
            $type
                .filter('input[value="create"]')
                .attr('checked', true)
                .change();
        }

        var formIsSubmitting = false; // Prevents multiple submissions if
        // users accidentally click on "save" twice.
        $('#h5p-content-form').submit(function(event) {
            if ($type.length && $type.filter(':checked').val() === 'upload') {
              return; // Old file upload
            }

            if (h5peditor !== undefined && !formIsSubmitting) {
                var params = h5peditor.getParams();

                if (params.params !== undefined) {
                    // Get content from editor (also validates the entered data 
                    // and metadata and upgrades the parameters as side effects)
                    h5peditor.getContent(function (content) {

                      // Set main library
                      $library.val(content.library);

                      // Set params
                      $params.val(content.params);

                      // Submit form data
                      formIsSubmitting = true;

                      $.ajax({
                          data: JSON.stringify({
                              library: content.library,
                              params: JSON.parse(content.params)
                          }),
                          headers: {
                              'Content-Type': 'application/json'
                          },
                          type: 'POST'
                      }).then((result) => {
                          const parsedResult = JSON.parse(result)
                          if(parsedResult.contentId) {
                              window.location.href = '${model.urlGenerator.play()}/' + parsedResult.contentId;
                          }
                      });
                    });

                    return event.preventDefault();
                    // TODO - Calculate & set max score
                    // $maxscore.val(h5peditor.getMaxScore(params.params));
                }
            }
        });

        // Title label
        var $title = $('#h5p-content-form #title');
        var $label = $title.prev();
        $title
            .focus(function() {
                $label.addClass('screen-reader-text');
            })
            .blur(function() {
                if ($title.val() === '') {
                    $label.removeClass('screen-reader-text');
                }
            })
            .focus();

        // Delete confirm
        $('.submitdelete').click(function() {
            return confirm(H5PIntegration.editor.deleteMessage);
        });
    };

    H5PEditor.getAjaxUrl = function(action, parameters) {
        var url = H5PIntegration.editor.ajaxPath + action;

        if (parameters !== undefined) {
            for (var property in parameters) {
                if (parameters.hasOwnProperty(property)) {
                    url += '&' + property + '=' + parameters[property];
                }
            }
        }

        url += window.location.search.replace(/\\?/g, '&');
        return url;
    };

    H5PEditor.enableContentHub = H5PIntegration.editor.enableContentHub
        || false;
    
    $(document).ready(H5PEditor.init);
})(H5P.jQuery);
</script>
</body>
</html>`;
