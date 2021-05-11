# If the editor and core files are missing, we download them from GitHub.
if [ ! -d "packages/h5p-examples/h5p/editor" ] || [ ! -d "packages/h5p-examples/h5p/core" ]
then    
    sh packages/h5p-examples/download-core.sh affaa83b51828be13e175c8ba1a7085ba9692d1d 7bc192798f8f6e1dee34891b56f3bf60ab320f3d
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
