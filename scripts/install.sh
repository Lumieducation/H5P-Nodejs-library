# If the editor and core files are missing, we download them from GitHub.
if [ ! -d "packages/h5p-examples/h5p/editor" ] || [ ! -d "packages/h5p-examples/h5p/core" ]
then    
    sh packages/h5p-examples/download-core.sh f3579c0d28205bf34490ee151c07d43a2ffc3507 0365b081efa8b55ab9fd58594aa599f9630268f6
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
