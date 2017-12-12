# Tropy -> Omeka

Create an Omeka API key under `User Preferences -> API keys` and save them into
a configuration file:

```json
{
  "omeka_api": "http://tromeka.chnm.org/omeka-s/api",
  "key_identity": "<your_identity>",
  "key_credential": "<your_credential>"
}
```

Export your items from Tropy using the context menu, e.g. to `items.jsonld`.

Run the exporter:

   npm run export -- --config /path/to/config.json --data /path/to/items.jsonld

Requires NodeJS 8 or later
