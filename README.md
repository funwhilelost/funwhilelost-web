# funwhilelost-web
funwhilelost.com 11ty static site

## Local Development

```bash
yarn dev
```

## Deployment

11ty build runs as a Github action and will get two secrets for the ENV.

```bash
gh secret set --repos funwhilelost/funwhilelost-web GRIST_API_KEY 
gh secret set --repos funwhilelost/funwhilelost-web MAPBOX_API_KEY
```

## OpenStreetMap to Mapbox Dataset to Mapbox Style

### Mapbox Recipe Spec
https://r.jina.ai/docs.mapbox.com/mapbox-tiling-service/recipe-specification/vector/

### Mapbox-Tilesets CLI Docs
https://pypi.org/project/mapbox-tilesets
