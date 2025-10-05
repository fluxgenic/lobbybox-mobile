# Deploying a Node.js API to Azure App Service (Linux)

This project now ships with a reusable GitHub Actions workflow that can deploy a Node.js API to an Azure App Service running on Linux. The workflow is designed to stay within the free tier by using GitHub-hosted runners and the standard App Service build process.

## Prerequisites

1. **Azure Web App**: Create an App Service (Linux) plan and a Web App configured for Node.js. The free F1 tier is sufficient for small workloads and proofs-of-concept.
2. **Publish profile**: From the Azure Portal, download the publish profile for the Web App. Store it in the repository secrets as `AZURE_WEBAPP_PUBLISH_PROFILE`.
3. **App name secret**: Add the Web App name as the secret `AZURE_WEBAPP_NAME` so the workflow can target the correct resource.
4. **Repository permissions**: Ensure GitHub Actions is enabled for the repository.

## Workflow overview

The workflow file lives at [`.github/workflows/deploy-node-api.yml`](../../.github/workflows/deploy-node-api.yml) and runs automatically when the `main` branch is updated. You can also trigger it manually from the **Actions** tab using the `workflow_dispatch` event.

### What the workflow does

1. Checks out the repository.
2. Sets up Node.js 18 (Azure App Service currently supports Node 18 on the free tier).
3. Installs production dependencies via `npm ci --omit=dev` (falls back to `npm install` if `package-lock.json` is missing).
4. Runs `npm run build` when a `build` script exists in `package.json`.
5. Copies either the `dist`, `build`, or the project root (excluding `node_modules` and `.next`) into a deployment package.
6. Deploys the package with `azure/webapps-deploy@v3` using the publish profile secret.

## Customisation

- **Project location**: By default the workflow expects the Node.js project at the repository root. If the API code lives in a different directory (for example `api/`), change the `APP_DIRECTORY` value near the top of the workflow file.
- **Runtime version**: Update `NODE_VERSION` if your Web App targets a different Node.js runtime.
- **Environment variables**: Configure production environment variables inside the Azure Portal or via App Service application settings.

## Manual deployments

If you need to deploy from the command line instead of relying on GitHub Actions, you can use the Azure CLI:

```bash
az webapp deploy \
  --name <your-app-name> \
  --resource-group <your-resource-group> \
  --src-path <path-to-build-artifact>
```

Keep the package size small to stay within the free tier's limits.
