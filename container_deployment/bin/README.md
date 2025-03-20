# Working with Docker

Our applications are deployed via Docker Compose. Below are a few common commands you may find useful.

## Deploying

We use the `up` and `down` scripts here to deploy our services. They're simple wrappers around `docker compose up -d` and `docker compose down`.

## Debugging

Commands useful for debugging

### View available Docker Compose services

```
docker compose config --services
```

### Logs

View the entire log with:

```
docker compose logs <service>
```

Or follow logs with:

```
docker compose logs --follow <service>
```

### List containers

```
docker container ls
```

Or via Compose with:

```
docker compose ps
```

### Get a shell in a container

This is a bit less helpful as containers are relatively locked down, but sometimes can be useful:

```
docker compose exec <service> bash
```

### Restart a service

```
docker compose restart <service>
```

### Redeploy services

```
docker compose down
docker system prune -af
docker compose pull
docker compose up -d
```
