# MATS Home

A home app for MATS & METexpress. Written in Go with the Gin framework.

## Getting Started

First, you'll need a settings file like so in `MATS/home`:

`settings.json`:

```json
{
    "config": {
        "is_met_express": false,
        "is_production": false,
        "environment_label": "Development",
        "display_alert": false,
        "alert_message": "Lorem ipsum dolor shutdown amet..."
    },
    "groups": [
    {
        "name": "Upper Air",
        "apps": [
        {
            "link": "upperair",
            "title": "Upper Air (RAOBs/AMDAR)",
            "kind": "MATS"
        },
        {
            "link": "met-upperair",
            "title": "MET Upper Air (Grid-to-Grid)",
            "kind": "METexpress"
        },
        {
            "link": "met-anomalycor",
            "title": "MET Anomaly Correlation (Grid-to-Grid)",
            "kind": "METexpress"
        }]
    },
    {
        "name": "Ceiling and Visibility",
        "apps": [{
            "link": "ceil-vis",
            "title": "Ceiling and Visibility (METAR)",
            "kind": "MATS"
        },
        {
            "link": "cb-ceiling",
            "title": "CB-Ceiling",
            "kind": "MATS-cb"
        },
        {
            "link": "ceil-vis15",
            "title": "15 Minute Ceiling and Visibility (METAR)",
            "kind": "MATS"
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
