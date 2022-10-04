# Kubernetes

## Manifests Layout

This project uses a Kustomize-style layout. `base` contains the default k8s manifests, while the `overlays` directory provides kustomize overrides for particular environments. You'll need Rancher Desktop installed locally. Trivy is recommended for security scanning.

## Getting Started

### Start app via CLI

Currently, you will need to create a `kubernetes/base/mongo/.env.mongo.secret` file containing the DB user and password:

```env
MONGO_INITDB_ROOT_PASSWORD=<admin_password>
MONGO_INITDB_ROOT_USERNAME=<admin_user>
```

Once you have that in place, you can start the app with:

```console
kubectl apply -k kubernetes/base                # Apply the Kustomize templates for the base services
kubectl get -k kubernetes/base                  # Get resource info
kubectl delete -k kubernetes/base               # Delete the resources
```

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