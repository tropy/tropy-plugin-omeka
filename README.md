# Tropy -> Omeka Plugin

This is a plugin for [Tropy](https://tropy.org). It can export selected items into an [Omeka S](https://omeka.org/s/) instance.

## Setup

    git clone https://github.com/tropy/tropy-omeka
    cd tropy-omeka
    npm install

## Configuration

Copy the default configuration

    cp config.default.json config.json

And populate it with your Omeka API key, found under `User Preferences -> API keys`.

## Running

Export your items from Tropy using the context menu, e.g. to `items.jsonld`. Run the exporter:

    npm run export -- --config /path/to/config.json --data /path/to/items.jsonld | bunyan

## Development

Run the tests in electron renderer process:

    npm run test
