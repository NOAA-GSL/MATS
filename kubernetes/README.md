# Kubernetes

## Manifests Layout

This project uses a Kustomize-style layout. `base` contains the default k8s manifests, while the `overlays` directory provides kustomize overrides for particular environments. You'll need Rancher Desktop installed locally. Trivy is recommended for security scanning.

## Getting Started

### Start app in a local Rancher Desktop via CLI

Currently, you will need to create the following files:

* A `kubernetes/overlays/local/mongo/.env.mongo.secret` file containing the DB user and password:

```env
MONGO_INITDB_ROOT_PASSWORD=<admin_password>
MONGO_INITDB_ROOT_USERNAME=<admin_user>
```

And then for each MATS app, you'll need 2 files - a `.env` and a `settings.json`. I'll use the scorecard app as an example:

* A `kubernetes/overlays/local/scorecard/.env` file containing the Delay, Root URL, and Mongo URL:

```env
DELAY=6
ROOT_URL=http://mats.127.0.0.1.nip.io/scorecard
MONGO_URL=mongodb://<admin_user>:<admin_password>@mongodb:27017/scorecard?authSource=admin 
```

* A `kubernetes/overlays/local/scorecard/settings.json` file copied from `mats-settings/configurations/dev/settings/scorecard/settings.json`.

You will also need to authenticate your docker client with the container registry. [GitHub has documentation on how to do that with a PAT](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-with-a-personal-access-token-classic). Your token will only need `read:packages` permissions and you'll need to authenticate it with the GitHub organization via SSO.

Once you have those settings files in place and you're authenticated with the container registry, you can start the app with:

```console
kubectl apply -k kubernetes/overlays/local                # Apply the Kustomize templates for the local services
kubectl get -k kubernetes/overlays/local                  # Get resource info
kubectl delete -k kubernetes/overlays/local               # Delete the resources
```

You should be able to visit the apps at: `http://mats.127.0.0.1.nip.io/<app_name>`. So for example, the scorecard app would be at: http://mats.127.0.0.1.nip.io/scorecard.

### Security scanning

```console
trivy image --ignore-unfixed --severity CRITICAL,HIGH <imagename>
```

## Other Tips

Get deployment yaml output from cluster

```console
kubectl get deploy deploymentname -o yaml
```

Get logs

```console
kubectl logs --namespace <namespace> deployment/<deployment name>
```

Inspect ConfigMap Values

```console
kubectl describe --namespace <namespace> configmaps <map name>
```

Enter a pod

```console
kubectl exec --namespace <namespace> --stdin --tty <pod> -- /bin/sh
```

### Linux - Allow unprivileged binding to ports lower than 1024 for Rancher Desktop

The following only applies to Linux - Mac lets non-admin users bind to ports lower than 1024.

Rancher desktop automatically starts a traefik ingress that tries to bind to `80` and `443`. On Linux, ports below 1024 are privileged so the ingress won't work.

```console
sudo sysctl net.ipv4.ip_unprivileged_port_start=80

# Or to make the change permanent
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-custom-unprivileged-port.conf
sysctl -p /etc/sysctl.d/99-custom-unprivileged-port.conf
```

And restart Rancher Desktop.

## Deploying in GSL

In GSL, we will need to add a secret to the intended namespace so we can pull from GHCR.

```console
 kubectl -n <namespace> create secret docker-registry mats-ghcr \
 --docker-server=ghcr.io \
 --docker-username=<your username> \
 --docker-password=<PAT with read:packages permission and granted SSO access to the GSL GitHub org>
```

For now, you'll need to create appropriate `settings.json` files and `.env` files in each MATS application's configuration which is a pain. They contain secrets so can't be checked into a public git repo. We could investigate sealed secrets or Hashicorp's vault but they would require buy-in from IT. We also could look to generate them before we `kubectl -n <namespace> apply -k ...` so they're pre-populated in the namespace - similarly to how the docker registry secret is currently handled.
