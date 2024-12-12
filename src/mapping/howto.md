---
layout: layouts/page.njk
---

# How To Map Trails

Most trails, conceptually, are a way to navigate over a collection of features that are stored in
Open Street Map.  Most of the time we'll select the pieces of features that are part of the route
and then add them to a "Relation".

So our trail may have a piece of abandoned fire road at the start, then a chunk of single track, 
then veer off onto an informal path.  We don't want to add a `name` attribute to the fire road,
or the path, we want to add all these properties to the relation.

For a cross-country ski trail we'll add one or more of these properties:

```
type=route
route=piste
piste:type=nordic
piste:difficulty=novice
name=Rabbit's Hollow
```

## See Also

- [OpenStreetMap US How-To](https://openstreetmap.us/our-work/trails/how-to-map/)
