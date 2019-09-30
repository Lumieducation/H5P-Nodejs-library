base=$(dirname $0)
mkdir -p "$base/tmp"
mkdir -p "$base/examples"
rm -rf "$base/tmp"/*

url=$1
echo "Downloading $url"

name=$(basename "$url")
curl -L "$url" -o"$base/tmp/$name"
unzip -a "$base/tmp/$name" -d"$base/examples/$name"

rm -rf "$base/tmp"