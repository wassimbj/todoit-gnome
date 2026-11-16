#!/bin/bash
set -e

variant="${1:-production}"

case "$variant" in
  production)
    build_dir="build"
    archive="todoit@wassimbj.github.io.zip"
    ;;
  test)
    build_dir="build-test"
    archive="todoit-test@wassimbj.github.io.zip"
    ;;
  *)
    echo "Usage: $0 [production|test]" >&2
    exit 2
    ;;
esac

echo "######## Build TypeScript ########"
yarn build

echo "######## Prepare $variant build ########"
rm -rf "$build_dir"
mkdir -p "$build_dir/schemas"
cp *.js "$build_dir"
cp stylesheet.css LICENCE "$build_dir"

if [ "$variant" = "test" ]; then
  sed \
    -e 's/"name": "Todoit"/"name": "Todoit (Test)"/' \
    -e 's/todoit@wassimbj.github.io/todoit-test@wassimbj.github.io/' \
    -e 's/org.gnome.shell.extensions.todoit/org.gnome.shell.extensions.todoit.test/' \
    metadata.json > "$build_dir/metadata.json"

  sed \
    -e 's/org.gnome.shell.extensions.todoit/org.gnome.shell.extensions.todoit.test/' \
    -e 's|/org/gnome/shell/extensions/todoit/|/org/gnome/shell/extensions/todoit/test/|' \
    schemas/org.gnome.shell.extensions.todoit.gschema.xml > \
    "$build_dir/schemas/org.gnome.shell.extensions.todoit.test.gschema.xml"
else
  cp metadata.json "$build_dir"
  cp schemas/*.gschema.xml "$build_dir/schemas"
fi

glib-compile-schemas "$build_dir/schemas"

echo "######## Create $archive ########"
rm -f "$archive"
(cd "$build_dir" && zip -r "../$archive" .)

echo "######## Build contents ########"
tree "$build_dir"
