# If the editor and core files are missing, we download them from GitHub.
if [ ! -d "h5p/editor" ] || [ ! -d "h5p/core" ]
then    
    sh scripts/download-core.sh 1.24.0
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