base=$(dirname $0)
mkdir -p "$base/tmp"
rm -rf "$base/tmp"/*

url=$1
echo "Downloading $url"

name=$(basename "$url")
curl -L "$url" -o"$base/tmp/$name"