.PHONY: start test-pack pack
EXTENSION_UUID ?= todoit@wassimbj.github.io

start:
	@test -x /usr/libexec/mutter-devkit || { echo "mutter-devkit is required (Fedora: sudo dnf install mutter-devkit)"; exit 1; }
	dbus-run-session -- sh -c 'gnome-extensions enable "$(EXTENSION_UUID)" && exec gnome-shell --wayland --devkit'

# build, install, and test the distributable archive
test-pack:
	sh build.sh test
	gnome-extensions install --force todoit-test@wassimbj.github.io.zip
	$(MAKE) start EXTENSION_UUID=todoit-test@wassimbj.github.io

# build schema
.PHONY: schemas
schemas:
	rm ./schemas/gschemas.compiled -f
	glib-compile-schemas ./schemas

# build ts
.PHONY: build
build:
	yarn build

clean_build:
	rm build *.zip *.js -rf

# run build
.PHONY: run
dev: clean_build build start

# pack the production build for distribution
pack:
	sh build.sh production
