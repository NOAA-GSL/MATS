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
		Title       string `json:"title"`
		METexpress  bool   `json:"met_express"`
		Environment string `json:"environment"`
		ProxyPrefix string `json:"proxy_prefix"`
	} `json:"config"`
	Groups []struct {
		Name string `json:"name"`
		Apps []struct {
			App   string `json:"app"`
			Title string `json:"title"`
			Color string `json:"color"`
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

	router.StaticFile("/favicon.svg", "./static/img/noaa-logo-rgb-2022.svg")
	router.Static("/img", "./static/img")
	router.Static("/css", "./static/bootstrap-5.3.1-dist/css")
	router.Static("/js", "./static/bootstrap-5.3.1-dist/js")
	router.LoadHTMLGlob("templates/*")
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
			"Title":       settings.Config.Title,
			"Environment": settings.Config.Environment,
			"ProxyPrefix": settings.Config.ProxyPrefix,
			"METexpress":  settings.Config.METexpress,
			"Groups":      settings.Groups,
		})
	}
}
