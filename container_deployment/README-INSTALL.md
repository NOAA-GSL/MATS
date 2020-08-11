#Dependencies:
You must have docker, docker-compose, httpaswd, and jq installed. You should have a certificate installed in /etc/ssl/certs.

Configuration steps:
1. install Docker, docker-compose, htpasswd (apache-utils), and jq.
2. Install a certificate in /etc/ssl/certs.
3. download the latest tar file from [setup.tar](https://drive.google.com/drive/folders/1lRBlHj8c_awcGSah-Ybv2pn_4gbLpi3L?usp=sharing)
4. un-bundle the tarball.
5. cd to the top level of the container_deployment directory - the top of the un-bundled tar file.
6. ./bin/configure
7. answer questions about domain, settings etc.
8. ./bin/up
9. wait for a moment then test at https://yourfullyqualifieddomain.

#Configuration details:
####maintainer:
This is a tool suite of applications that run under Docker.
For questions or bugs you can use the "contact" link in the header at the top of the landing page or
if you have NOAA credentials you can use the "bugs/issues" link at the top of each application.
Failing that contact Randy Pierce at randy.pierce@noaa.gov 
####setup program
The setup program will help you configure your tool suite environment based on one of the standard environments.
To do this you must have access to the internet.

This setup program will query the [GSD server](https://www.esrl.noaa.gov/gsd/mats/appProductionStatus) which deployment environments are currently
supported for assisted deployment. It will ask you to choose which environment you wish to deploy. The setup will ask the GSD appProductionStatus
server what apps and versions of the apps for your selected deployment are currently up to date and then prompt you for the database credentials for each
database role required by each app. These credentials are to your own database. For METexpress this is the METviewer database and the credentials will likely be the same for each app.
####Database Roles
Database roles are usually some combination of 
* meta_data - the database that contains app metadata,
* sums_data - the database that contains an apps statistical partial sum data, 
* model_data - a database that contains metadata about data sources, 
* and sites_data - which contains non standard domain data.
####Database Credentials
The credentials that you provide are stored in an `INSTALL_DIR/settings` directory 
with the structure `INSTALL_DIR/settings/appreference/settings.json` (where appreference is the
deployment service name of an app, like met-upperair).
If you are familiar with this directory and the settings.json files you can make changes with an editor and the setup program
will give you the option to use the existing values as defaults. Alternatively you can answer the setup questions and the program
will create these files for you.

####Settings Directory
This is an example of a settings directory for metexpress..
* ./settings/met-upperair/settings.json
* ./settings/met-anomalycor/settings.json
* ./settings/met-surface/settings.json

####Example Settings
This is an example of a settings.json file with dummy credentials.

    {
      "private": {
        "databases": [
          {
            "role": "sum_data",
            "status": "active",
            "host": "some_host",
            "port": "3306",
            "user": "some_user",
            "password": "some_password",
            "database": "some_database",
            "connectionLimit": 4
          },
          {
            "role": "metadata",
            "status": "active",
            "host": "some_host",
            "port": "3306",
            "user": "some_user",
            "password": "some_password",
            "database": "some_database",
            "connectionLimit": 1
          }
        ],
        "PYTHON_PATH": "/usr/bin/python3"
      },
      "public": {}
    }

####Running the setup program
To run the program: cd into this directory (the top of the directory where you un-tarred this bundle) and run
`bash bin/configure`

The program will download the latest setup program from the GSD server and run it from a temporary location. The installer script is not persisted, it will
be retrieved new each time.

####Setup artifacts
The setup program configures this deployment directory, creating a `./docker-compose.yml` configuration file,
and a `./traefik.toml` file, a suitable `./web/index.html` as a homepage, each configured depending on the deployment environment you chose.

####Setup Dependencies
You must have docker, docker-compose and jq installed, and you must be running this script from the top of your deployment directory (where you
un-tarred the bundle).

You should be running this program as a user that can run docker - do not run this script as root, in fact do not run this as any authorized user.
Create an unauthorized user and add that user to the docker group and run the apps as that user.

####Re-running setup
After once configuring an app you will have to confirm overwriting the old configuration if you run setup again.

####Traefik credentials
The reverse proxy has a user/password pre-set to user "admin" and password "adminipassword", you should change this by following the instructions in the traefik.toml file.
This program will create a settings directory here in this directory and a mongodata directory in the $HOME of the deployment user, if they do not already exist.

You need to acquire an SSL cert for your domain and put the certificate in /etc/ssl/certs directory of this host. That docker-compose.yml file
will map the cert directory to the proxy app.

####Letsencypt certificate
If you have authority over the DNS entry for
your server you can use LetsEncrypt for no cost certs. The instructions for doing this are at https://docs.traefik.io/configuration/acme/.

####Entrypoints
The tool suite entrypoints are
* https://yourfullyqualifieddomaini/proxy for the reverse proxy dashboard (look at comments in traefik.toml and docker-compose.yml to enable)
* https://yourfullyqualifieddomain  for the top level landing page
* https://yourfullyqualifieddomain/appref   for an individual app (replace appref with the actual app reference.)

####starting the service
After configuration you can start your tool suite with....
./bin/up
and you can stop your tool suite with..
./bin/down

####Uninstall
You can uninstall the docker images with bin/uninstall. This leaves the docker configuration in place so that a subsequent bin/up
will retrieve new images.

####Utilities
* You can check for running containers with bin/ps.
* You can list the running container services with bin/list.
* You can list just the service names with bin/listNames.
* You can show a containers log files with bin/showLog serviceName - where serviceName is one of the names from bin/listNames.
* You can inspect a running container with bin/inspect serviceName.
* You can restart a service (for example if you change settings for a single service) with bin/restartService serviceName.

you can rerun this setup with...
>cd your_deployment_directory
>bash bin/configure

You may want to occasionally rerun the setup to pick up bug fixes and newly released apps for your deployment. This URL
https://www.esrl.noaa.gov/gsd/mats/appProductionStatus/versions shows the latest versions of the apps available for all the deployments.
By comparing those versions to the versions in your running apps you can determine if an update is necessary. You
can tell the version of a running app by looking at the comments in the docker-compose.yml file. This file is recreated when
you run the setup, with the current version for each app.

####Debugging
Debugging startup problems:
You can list services with `bin/listNames` and you can view a service log with
`bin/showLog NAME` where NAME is from the "docker service ls" output.
You can inspect a single service with `docker service inspect NAME`.


