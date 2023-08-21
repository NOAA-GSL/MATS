# MATS Home

A home app for MATS & METexpress. Written in Go with the Gin framework.

## Getting Started

First, you'll need a settings file like so in `MATS/home`:

`settings.json`:
```json
{
    "config": {
        "met_express": false,
        "environment": "Development"
    },
    "groups": [
    {
        "name": "Upper Air",
        "apps": [
        {
            "link": "upperair",
            "title": "Upper Air",
            "color": "#3366bb",
            "app_type": "MATS"
        },
        {
            "link": "met-upperair",
            "title": "MET Upper Air",
            "color": "darkorchid",
            "app_type": "METexpress"
        },
        {
            "link": "met-anomalycor",
            "title": "MET Anomaly Correlation",
            "color": "darkorchid",
            "app_type": "METexpress"
        }]
    },
    {
        "name": "Ceiling and Visibility",
        "apps": [{
            "link": "ceil-vis",
            "title": "Ceiling and Visibility",
            "color": "#3366bb",
            "app_type": "MATS"
        },
        {
            "link": "cb-ceiling",
            "title": "CB-Ceiling",
            "color": "teal",
            "app_type": "MATS-cb"
        },
        {
            "link": "ceil-vis15",
            "title": "15 Minute Ceiling and Visibility",
            "color": "#3366bb",
            "app_type": "MATS"
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
