# Working with Docker

Our applications are deployed via Docker Compose. Below are a few common commands you may find useful.

## Deploying

We use the `up` and `down` scripts here to deploy our services. They're simple wrappers around `docker compose up -d` and `docker compose down`.

## Debugging

Commands useful for debugging

### Logs

View the entire log with:

```
docker logs <container>
```

Or follow logs with:

```
docker logs --follow <container>
```

### List containers

```
docker container ls
```

### Get a shell in a container

This is a bit less helpful as containers are relatively locked down, but sometimes can be useful:

```
docker exec -it <container-id> bash
```
