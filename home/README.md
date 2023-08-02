# MATS Home

A home app for MATS & METexpress. Written in Go with the Gin framework.

## Getting Started

First, you'll need a settings file like so in `MATS/home`:

`settings.json`:
```json
{
    "config": {
        "title": "MATS: Model Application Tool Suite",
        "met_express": false,
        "environment": "Development",
        "proxy_prefix": "bar"
    },
    "groups": [
    {
        "name": "Upper Air",
        "apps": [
        {
            "app": "upperair",
            "title": "Upper Air",
            "color": "#3366bb"
        },
        {
            "app": "met-upperair",
            "title": "MET Upper Air",
            "color": "darkorchid"
        },
        {
            "app": "met-anomalycor",
            "title": "MET Anomaly Correlation",
            "color": "darkorchid"
        }]
    },
    {
        "name": "Ceiling and Visibility",
        "apps": [{
            "app": "ceil-vis",
            "title": "Ceiling and Visibility",
            "color": "#3366bb"
        },
        {
            "app": "cb-ceiling",
            "title": "CB-Ceiling",
            "color": "teal"
        },
        {
            "app": "ceil-vis15",
            "title": "15 Minute Ceiling and Visibility",
            "color": "#3366bb"
        }]
    },
    // etc...
    }]
}
```

And now, assuming your shell is in the `MATS/home` directory.

Run the application with:

```console
go run .
```

Lint the application with:

```console
golangci-lint run
```

Test the application with:

```console
go test
```

## Building

The CI file is the best reference for how to build the image. However, you should be able to do the following locally:

```console
docker build -t home:local .
docker run -p 8080:8080 --mount 'type=bind,src=./settings.json,dst=/app/settings.json,ro' home:local
```
