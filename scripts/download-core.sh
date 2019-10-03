base="$(dirname $0)/../h5p"
mkdir -p "$base/tmp"
mkdir -p "$base/tmp/core"
mkdir -p "$base/tmp/editor"
mkdir -p "$base/core"
mkdir -p "$base/editor"
mkdir -p "$base/libraries"

rm -rf "$base/tmp"/*
rm -rf "$base/core"/*
rm -rf "$base/editor"/*

version=$1

core=https://github.com/h5p/h5p-php-library/archive/$version.zip
editor=https://github.com/h5p/h5p-editor-php-library/archive/$version.zip

curl -L $core -o"$base/tmp/core.zip"
unzip -a "$base/tmp/core.zip" -d"$base/tmp/core"
curl -L $editor -o"$base/tmp/editor.zip"
unzip -a "$base/tmp/editor.zip" -d"$base/tmp/editor"
mv "$base/tmp/core/h5p-php-library-$version"/* "$base/core/"
mv "$base/tmp/editor/h5p-editor-php-library-$version"/* "$base/editor/"

rm -rf "$base/tmp"