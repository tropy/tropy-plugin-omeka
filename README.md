# Tropy -> Omeka

## Setup

Create an Omeka API key under `User Preferences -> API keys`
and save them into a configuration file:

    cp config.default.json config.json

Export your items from Tropy using the context menu, e.g. to `items.jsonld`.

## Running

Ensure NodeJS 8 or later with nvm:

    nvm use

Run the exporter:

    npm run export -- --config /path/to/config.json --data /path/to/items.jsonld
