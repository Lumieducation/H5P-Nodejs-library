# Call this script with the version of the H5P core as the first argument 
# (= version tag of h5p-php-library) and the H5P editor as the second argument
# (= version tag of h5p-editor-php-library).
# Example: download-core.sh 1.24.0 1.24.1

core_version=$1
if [ ! -z "$2" ]
then
    editor_version=$2
else
    editor_version=$1
fi

if [ -z "$core_version" ]
then
    echo "You must add the H5P core version as the first argument to this script."
    exit
fi

echo "Downloading H5P core v$core_version..."
echo "Downloading H5P editor v$editor_version..."

base="$(dirname $0)/h5p"
mkdir -p "$base/tmp"
mkdir -p "$base/tmp/core"
mkdir -p "$base/tmp/editor"
mkdir -p "$base/core"
mkdir -p "$base/editor"
mkdir -p "$base/libraries"

rm -rf "$base/tmp"/*
rm -rf "$base/core"/*
rm -rf "$base/editor"/*

core=https://github.com/h5p/h5p-php-library/archive/$core_version.zip
editor=https://github.com/h5p/h5p-editor-php-library/archive/$editor_version.zip

curl -L $core -o"$base/tmp/core.zip"
unzip -a "$base/tmp/core.zip" -d"$base/tmp/core"
curl -L $editor -o"$base/tmp/editor.zip"
unzip -a "$base/tmp/editor.zip" -d"$base/tmp/editor"
mv "$base/tmp/core/h5p-php-library-$core_version"/* "$base/core/"
mv "$base/tmp/editor/h5p-editor-php-library-$editor_version"/* "$base/editor/"

rm -rf "$base/tmp"