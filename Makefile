.PHONY: all setup build build-release run test coverage lint format clean

all: build

setup:
	./Scripts/setup.sh

build:
	swift build

build-release:
	swift build -c release

app:
	./Scripts/build-app.sh

run:
	swift run

test:
	swift test

coverage:
	./Scripts/check-coverage.sh

lint:
	swiftlint lint --strict

format:
	swiftlint --fix

clean:
	rm -rf .build dist
