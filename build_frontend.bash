#!/bin/bash

STATIC_DIR="static/cinema"
CINEMA_DIR="cinema"

echo "Removing ${STATIC_DIR}"
rm -rf "${STATIC_DIR}"

pushd "$CINEMA_DIR"
npm run build
popd
cp -r "$CINEMA_DIR/build" "$STATIC_DIR"
echo "Done :)"
