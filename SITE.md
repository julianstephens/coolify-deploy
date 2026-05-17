# Coolify Deploy

[Coolify](https://coolify.io/) is a self-hosted platform that allows you to deploy and manage your applications with ease. It provides a user-friendly interface and supports various deployment methods, making it an excellent choice for developers looking to streamline their deployment process. While it has a REST API, it does not currently have an official Terraform provider or other infrastructure as code (IaC) support. The goal of this project is to provide a lighweight Terraform-like CLI tool that can be used to manage Coolify deployments in a declarative manner.

## Features

- **Declarative Deployment**: Define applications in a JSON manifest and let the reconciler handle creation, updates, and deployments.
- **Manifest Generation**: Scan your repository for `Dockerfile`s and generate a manifest, with optional introspection of your Coolify environment.
- **Docker Image Support**: Works with prebuilt Docker images from container registries like GHCR.
- **Environment Variable Management**: Parse `.env` formatted secrets and apply them to applications.
- **Structured Logging**: All operations are logged in a structured JSON format for clear, machine-readable output.
- **Dry Run & Drift Detection**: Test your deployments without making changes and see a summary of what would happen (create, update, prune).
- **Strict Reconciliation**: Automatically prunes undefined resources and environment variables to prevent configuration drift.
- **Deployment Polling**: Waits for deployments to finish and reports the final status, ensuring CI pipelines reflect the true outcome.
- **Idempotent**: Safe to run multiple times; it creates new applications or updates existing ones only as needed.

## Architecture

The tool is built using Node.js and TypeScript, leveraging the Coolify REST API to manage applications. It consists of three commands: apply, state, and init. The `apply` command takes a manifest file and reconciles it with the current state of the Coolify environment, creating or updating applications as needed. The `state` command allows you to inspect the current state of your applications in Coolify, while the `init` command helps you generate a manifest file based on your repository's structure and optionally introspect your existing Coolify environment.

```
┌─────────────────────────────────────────────┐
│                  CLI Entry                  │
│               cli.ts → main()               │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│             Program / Commands              │
│               program.ts                    │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐   │
│  │  apply   │ │  state   │ │    init    │   │
│  └────┬─────┘ └────┬─────┘ └─────┬──────┘   │
└───────┼────────────┼─────────────┼──────────┘
        │            │             │
┌───────▼────┐  ┌────▼──────┐ ┌───▼──────────┐
│ Reconciler │  │CoolifyClnt│ │ Manifest     │
│reconciler.ts│ │coolify.ts │ │ manifest.ts  │
└───────┬────┘  └────┬──────┘ └──────────────┘
        │            │
        └────────────┘
              │
┌─────────────▼──────────────────────────────┐
│             Coolify REST API               │
│          /api/v1/applications, etc.        │
└────────────────────────────────────────────┘
```

### Reconciler Workflow

The reconciler is the core component of the `apply` command. It takes the desired state defined in the manifest and compares it with the current state of the Coolify environment. Based on this comparison, it determines which applications need to be created, updated, or pruned. The reconciler then performs the necessary API calls to bring the actual state in line with the desired state.

**Reconciler.reconcile()**:

1. Verify the target environment exists
2. For each resource in the manifest:

     - Parse the .env-formatted secret into CoolifyEnvVar[]
     - Find the app by name in the environment
     - Create if absent → createDockerImageApp() + deploy
     - Update if present → updateApp() + re-deploy (only if tag or config changed)
     - Reconcile env vars strictly (prune vars not in manifest)
3. Prune apps present in Coolify but absent from the manifest
4. Poll all triggered deployments to completion via waitForDeployment()

### Manifest File Schema

```json
{
  "projectId": "<Coolify project UUID>",
  "destinationId": "<Docker engine UUID>",
  "environmentName": "production",
  "serverId": "<server UUID>",
  "resources": [
    {
      "name": "my-app",
      "dockerImageName": "ghcr.io/owner/repo/service",
      "envSecretName": "MY_APP_ENV",   // key in COOLIFY_ENV_* vars
      "domains": "app.example.com",
      "portsExposes": "3000",
      "healthCheck": { "path": "/health", "port": "3000" }
    }
  ]
}
```

## Personal Usage

I use this tool to manage my personal projects deployed on Coolify. It allows me to keep my deployment configuration in version control and easily update my applications by simply including the GitHub action workflow below in my repositories. This way, I can ensure that my deployments are consistent and easily reproducible.

```yaml
name: Build and Release

on:
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

permissions:
  id-token: write
  contents: read
  packages: write

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Get short SHA
        id: sha
        run: echo "sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Log in to GitHub Container registry
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile
          push: true
          target: runner
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.sha.outputs.sha }}
          cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache
          cache-to: type=registry,ref=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:cache,mode=max
          build-args: |
            ${{ format('VITE_POCKETBASE_URL={0}', secrets.VITE_POCKETBASE_URL) || '' }}

  deploy:
    name: Deploy to Coolify
    runs-on: ubuntu-latest
    needs: [build-and-push]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v5

      - name: Get short SHA
        id: sha
        run: echo "sha=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24

      - name: Log in to GitHub Container registry
        uses: docker/login-action@v4
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Run coolify-deploy
        env:
          COOLIFY_ENDPOINT_URL: ${{ secrets.COOLIFY_ENDPOINT_URL }}
          COOLIFY_TOKEN: ${{ secrets.COOLIFY_TOKEN }}
          MANIFEST_PATH: ./coolify.manifest.json
          COOLIFY_ENV_API: ${{ secrets.COOLIFY_ENV_API }}
          LOG_LEVEL: debug
        run: |
          if [ -z "$COOLIFY_ENDPOINT_URL" ] || [ -z "$COOLIFY_TOKEN" ]; then
            echo "Warning: COOLIFY_ENDPOINT_URL or COOLIFY_TOKEN not set, skipping deployment"
            exit 0
          fi
          echo $"Using COOLIFY_ENDPOINT_URL: $COOLIFY_ENDPOINT_URL"
          if [ ! -f "$MANIFEST_PATH" ]; then
            echo "Warning: Manifest file not found at $MANIFEST_PATH, skipping deployment"
            exit 0
          fi
          npx coolify-deploy --manifest "$MANIFEST_PATH" apply --tag "${{ steps.sha.outputs.sha }}"
```
