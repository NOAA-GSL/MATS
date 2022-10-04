# Manifests

A manifest is a specification of a Kubernetes API object in JSON or YAML format.
A manifest specifies the desired state of an object that Kubernetes will maintain when you apply the manifest. Each configuration file can contain multiple manifests.

These are examples intended to make it easier to quickly deploy a container via kubectl, nerdctl or another command line kubernetes tool.

The official way to deploy will be by Helm chart and those are managed in the VxHelm repo.

Here we will keep copies of an example:

1. Workload manifest for mongo
2. Workload manifest for the scorecard app (as an example)
3. Service maifest for the scorecard
4. Persistent Volume manifest for the matsdata volume
