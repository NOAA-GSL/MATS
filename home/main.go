package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

type ConfigJSON struct {
	Config struct {
		IsMETexpress     bool   `json:"is_met_express"`
		IsProduction     bool   `json:"is_production"`
		EnvironmentLabel string `json:"environment_label"`
	} `json:"config"`
	Groups []struct {
		Name string `json:"name"`
		Apps []struct {
			Link  string `json:"link"`
			Title string `json:"title"`
			Kind  string `json:"kind"`
		} `json:"apps"`
	} `json:"groups"`
}

func parseConfig(file string) (ConfigJSON, error) {
	var conf ConfigJSON
	configFile, err := os.Open(file)
	if err != nil {
		log.Print("opening config file", err.Error())
		configFile.Close()
		return ConfigJSON{}, err
	}
	defer configFile.Close()

	jsonParser := json.NewDecoder(configFile)
	if err = jsonParser.Decode(&conf); err != nil {
		log.Print("parsing config file", err.Error())
		return ConfigJSON{}, err
	}

	return conf, nil
}

func main() {
	// FIXME: Let user specify config location or pass an env var with config
	conf, err := parseConfig("settings.json")
	if err != nil {
		log.Fatal("Unable to parse config")
	}

	router := gin.Default()
	router.Use(prometheusMiddleware()) // Attach our prometheus middleware

	// Load in the HTML templates
	router.LoadHTMLGlob("templates/*")

	// Serve up our static files
	router.StaticFile("/favicon.svg", "./static/img/noaa-logo-rgb-2022.svg")
	router.Static("/img", "./static/img")
	router.Static("/css", "./static/css")
	router.Static("/js", "./static/js")
	router.Static("/bs", "./static/bootstrap-5.3.1-dist")

	// Handle requests
	router.GET("/", indexHandler(conf))
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "App is online",
		})
	})
	router.GET(defaultMetricPath, gin.WrapH(promhttp.Handler()))
	_ = router.Run(":8080")
}

func indexHandler(settings ConfigJSON) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
			"Config": settings.Config,
			"Groups": settings.Groups,
		})
	}
}
