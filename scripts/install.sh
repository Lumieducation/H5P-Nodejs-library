# If the editor and core files are missing, we download them from GitHub.
if [ ! -d "packages/h5p-examples/h5p/editor" ] || [ ! -d "packages/h5p-examples/h5p/core" ]
then    
    sh packages/h5p-examples/download-core.sh 829524eaf81fe3f3a295d0e843812be4735f51fc 80b3b281ee9d064b563f242e8ee7a0026b5bf205
else
    echo "Not downloading H5P Core and Editor files as they are already present!"
fi

# We only download the content examples if the script is not executed in a 
# CI environment. In a CI environment the scripts must be downloaded later to
# be able to squeeze in the cache restore before downloading them.
if [ "$CI" != "true" ]
then
    npm run download:content
else
    echo "Not downloading content file as this is run in a CI environment. Execute npm run download:content to download the examples."
fi
