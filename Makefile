.PHONY: all setup dev build start test coverage lint format typecheck check package app release clean

all: build

setup:
	./Scripts/setup.sh

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

test:
	npm test

coverage:
	npm run test:coverage

lint:
	npm run lint

format:
	npm run lint:fix

typecheck:
	npm run typecheck

check:
	npm run check

package:
	npm run package

app:
	npm run package

release:
	./Scripts/release-package.sh

clean:
	rm -rf out dist coverage node_modules
