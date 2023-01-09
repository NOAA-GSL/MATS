# Kubernetes

## Manifests Layout

This project uses a Kustomize-style layout. `base` contains the default k8s manifests, while the `overlays` directory provides kustomize overrides for particular environments. You'll need Rancher Desktop installed locally. Trivy is recommended for security scanning.

## Getting Started

### Start app via CLI

Currently, you will need to create the following files:

* A `kubernetes/base/mongo/.env.mongo.secret` file containing the DB user and password:

```env
MONGO_INITDB_ROOT_PASSWORD=<admin_password>
MONGO_INITDB_ROOT_USERNAME=<admin_user>
```

* A `kubernetes/base/scorecard/.env` file containing the Delay, Root URL, and Mongo URL:

```env
DELAY=6
ROOT_URL=http://mats.127.0.0.1.nip.io/scorecard
MONGO_URL=mongodb://<admin_user>:<admin_password>@mongodb:27017/scorecard?authSource=admin 
```

* A `kubernetes/base/scorecard/settings.json` file copied from `mats-settings/configurations/dev/settings/scorecard/settings.json`.

Once you have those three files in place, you can start the app with:

```console
kubectl apply -k kubernetes/base                # Apply the Kustomize templates for the base services
kubectl get -k kubernetes/base                  # Get resource info
kubectl delete -k kubernetes/base               # Delete the resources
```

You should be able to visit the scorecard app at: http://mats.127.0.0.1.nip.io/scorecard

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
kubectl logs --namespace <namespace> <pod>
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