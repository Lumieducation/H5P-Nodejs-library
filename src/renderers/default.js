module.exports = model => `<html>
<head>
<meta charset="UTF-8">
<script> window.H5PIntegration = parent.H5PIntegration || ${JSON.stringify(
    model.integration,
    null,
    2
)}</script>
${model.styles
    .map(style => `<link rel="stylesheet" href="${style}">`)
    .join('\n    ')}
${model.scripts
    .map(script => `<script src="${script}"></script>`)
    .join('\n    ')}
</head>
<body>
<form method="post" enctype="multipart/form-data" id="h5p-content-form"><div id="post-body-content"><div class="h5p-create"><div class="h5p-editor"></div></div></div><input type="submit" name="submit" value="Create" class="button button-primary button-large"></form>
</body>
</html>`;
