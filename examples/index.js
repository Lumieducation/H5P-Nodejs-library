module.exports = model => `<html>
<head>
<meta charset="UTF-8">
</head>
<body>
<h3>Created/Uploaded Content</h3>
<ul>
${model.contentIds
    .map(
        id =>
            `<li>${id} <a href="/play?contentId=${id}">[play]</a> <a href="/edit?contentId=${id}">[edit]</a></li>`
    )
    .join('')}
</ul>
<h4><a href="/edit">Create New Content</a></h4>
<h3>Examples from H5P.org</h3>
<i>Clicking on the examples will download the examples, copy them to the content and display them.</i>
<ul>
${model.examples
    .map(
        (example, i) => `
            <li><a href="examples/${i}">${example.library}: ${example.name}</a> 
            | <a href="${example.page}">original</a></li>`
    )
    .join('')}
</ul>
</body>
</html>`;
