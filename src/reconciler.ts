import { CoolifyClient, type CoolifyEnvVar } from "./coolify";
import type { Logger } from "./logger";
import type { Manifest, Resource } from "./manifest";

/**
 * Result of reconciling a single resource.
 */
export interface ReconcileResourceResult {
  name: string;
  action: "created" | "updated" | "unchanged" | "failed" | "pruned";
  uuid?: string;
  deploymentUuid?: string;
  error?: string;
}

/**
 * Result of the full reconciliation.
 */
export interface ReconcileResult {
  success: boolean;
  resources: ReconcileResourceResult[];
  totalCreated: number;
  totalUpdated: number;
  totalFailed: number;
  totalPruned: number;
}

/**
 * Options for the reconciler.
 */
export interface ReconcilerOptions {
  manifest: Manifest;
  dockerTag: string;
  envSecrets?: Record<string, string>;
  serverId?: string;
}

/**
 * Parses a .env formatted string into key-value pairs.
 * Supports:
 * - KEY=value
 * - KEY="quoted value"
 * - KEY='single quoted value'
 * - Comments starting with #
 * - Empty lines
 */
export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Match KEY=value pattern
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2];

    // Handle quoted values and mismatched quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else if ((value.startsWith('"') && !value.endsWith('"')) || (value.startsWith("'") && !value.endsWith("'"))) {
      // Mismatched quotes detected, skip this line or document the behavior
      // Optionally, log a warning here if a logger is available
      continue;
    }

    result[key] = value;
  }

  return result;
}

/**
 * Converts parsed env vars to Coolify format.
 */
export function envVarsToCoolifyFormat(envVars: Record<string, string>): CoolifyEnvVar[] {
  return Object.entries(envVars).map(([key, value]) => ({
    key,
    value,
    is_preview: false,
    is_literal: true,
    is_multiline: value.includes("\n"),
    is_shown_once: false,
  }));
}

/**
 * Reconciles resources defined in the manifest with Coolify.
 */
export class Reconciler {
  private readonly client: CoolifyClient;
  private readonly logger: Logger;
  private readonly options: ReconcilerOptions;

  constructor(client: CoolifyClient, logger: Logger, options: ReconcilerOptions) {
    this.client = client;
    this.logger = logger;
    this.options = options;
  }

  /**
   * Reconciles all resources in the manifest.
   */
  async reconcile(): Promise<ReconcileResult> {
    const { manifest, dockerTag, envSecrets = {} } = this.options;
    const results: ReconcileResourceResult[] = [];
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalPruned = 0;

    this.logger.info(
      {
        projectId: manifest.projectId,
        environmentName: manifest.environmentName,
        resourceCount: manifest.resources.length,
        dockerTag,
      },
      "Starting reconciliation",
    );

    // Check if the environment exists
    const environment = await this.client.findEnvironmentByName(manifest.projectId, manifest.environmentName);

    if (!environment) {
      this.logger.error(
        {
          projectId: manifest.projectId,
          environmentName: manifest.environmentName,
        },
        "Target environment does not exist in Coolify project",
      );
      return {
        success: false,
        resources: manifest.resources.map((r) => ({
          name: r.name,
          action: "failed",
          error: "Target environment does not exist",
        })),
        totalCreated: 0,
        totalUpdated: 0,
        totalFailed: manifest.resources.length,
        totalPruned: 0,
      };
    }

    this.logger.info(
      { environmentName: manifest.environmentName },
      "Environment exists, will update resources as needed",
    );

    // Determine server UUID
    const serverId = this.options.serverId ?? manifest.serverId;
    if (!serverId) {
      this.logger.error({}, "Server ID is required but not provided in manifest or options");
      return {
        success: false,
        resources: [],
        totalCreated: 0,
        totalUpdated: 0,
        totalFailed: manifest.resources.length,
        totalPruned: 0,
      };
    }

    // Process each resource
    for (const resource of manifest.resources) {
      try {
        // Get env vars for this specific resource
        const envFileContent = envSecrets[resource.envSecretName];
        let envVars: CoolifyEnvVar[] = [];
        if (envFileContent) {
          const parsed = parseEnvFile(envFileContent);
          envVars = envVarsToCoolifyFormat(parsed);
          this.logger.info(
            { resource: resource.name, envVarCount: envVars.length },
            "Parsed environment variables for resource",
          );
        } else {
          this.logger.warn(
            { resource: resource.name, secretName: resource.envSecretName },
            "No environment variable content found for resource",
          );
        }

        const result = await this.reconcileResource(resource, serverId, environment.uuid, environment.id, envVars);
        results.push(result);

        if (result.action === "created") {
          totalCreated++;
        } else if (result.action === "updated") {
          totalUpdated++;
        } else if (result.action === "failed") {
          totalFailed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error({ resource: resource.name, error: errorMessage }, "Failed to reconcile resource");
        results.push({
          name: resource.name,
          action: "failed",
          error: errorMessage,
        });
        totalFailed++;
      }
    }

    // Prune resources
    const prunedResources = await this.pruneResources(environment.id, manifest.resources);
    results.push(...prunedResources);
    totalPruned = prunedResources.length;

    // Wait for all deployments to finish
    const deployments = results.filter((r) => r.deploymentUuid).map((r) => ({ name: r.name, uuid: r.deploymentUuid! }));

    if (deployments.length > 0) {
      this.logger.info({ count: deployments.length }, "Waiting for deployments to finish...");
      const deploymentResults = await Promise.allSettled(deployments.map((d) => this.client.waitForDeployment(d.uuid)));

      let deploymentFailures = 0;
      deploymentResults.forEach((result, index) => {
        const deployment = deployments[index];
        if (result.status === "rejected") {
          deploymentFailures++;
          this.logger.error(
            { app: deployment.name, deploymentUuid: deployment.uuid, error: result.reason.message },
            "Deployment failed",
          );
          // Update the resource result to reflect the failure
          const resourceResult = results.find((r) => r.deploymentUuid === deployment.uuid);
          if (resourceResult) {
            resourceResult.action = "failed";
            resourceResult.error = result.reason.message;
          }
        } else {
          this.logger.info(
            { app: deployment.name, deploymentUuid: deployment.uuid },
            "Deployment finished successfully",
          );
        }
      });

      if (deploymentFailures > 0) {
        totalFailed += deploymentFailures;
        // Adjust counts if needed (e.g., if it was counted as created/updated but then failed)
        // For simplicity, we just increment totalFailed. The resource action is updated above.
      }
    }

    const success = totalFailed === 0;
    this.logger.info({ success, totalCreated, totalUpdated, totalFailed, totalPruned }, "Reconciliation complete");

    return {
      success,
      resources: results,
      totalCreated,
      totalUpdated,
      totalFailed,
      totalPruned,
    };
  }

  /**
   * Reconciles environment variables for an application.
   * Prunes variables that are not present in the desired list.
   */
  private async reconcileEnvironmentVariables(appUuid: string, desiredEnvVars: CoolifyEnvVar[]): Promise<void> {
    // 1. List current env vars
    const currentEnvVars = await this.client.listEnvironmentVariables(appUuid);

    // 2. Identify env vars to delete
    const desiredKeys = new Set(desiredEnvVars.map((e) => e.key));
    // We only delete variables that are NOT in the desired list.
    // We filter out variables that are marked as preview-only if we are not deploying a preview?
    // For now, we assume strict reconciliation: if it's not in the manifest, it goes.
    const varsToDelete = currentEnvVars.filter((e) => !desiredKeys.has(e.key));

    if (varsToDelete.length > 0) {
      this.logger.info({ appUuid, count: varsToDelete.length }, "Pruning environment variables");
      for (const envVar of varsToDelete) {
        await this.client.deleteEnvironmentVariable(appUuid, envVar.uuid);
      }
    }

    // 3. Update/Add desired env vars
    if (desiredEnvVars.length > 0) {
      await this.client.updateEnvironmentVariables(appUuid, desiredEnvVars);
    }
  }

  /**
   * Prunes resources that are present in the environment but not in the manifest.
   */
  private async pruneResources(
    environmentId: number,
    manifestResources: Resource[],
  ): Promise<ReconcileResourceResult[]> {
    const results: ReconcileResourceResult[] = [];

    // 1. List all applications
    const allApps = await this.client.listApplications();

    // 2. Filter by environment
    const envApps = allApps.filter((app) => app.environment_id === environmentId);

    // 3. Identify apps to delete
    const manifestAppNames = new Set(manifestResources.map((r) => r.name));
    const appsToDelete = envApps.filter((app) => !manifestAppNames.has(app.name));

    if (appsToDelete.length > 0) {
      this.logger.info({ count: appsToDelete.length }, "Pruning resources");
      for (const app of appsToDelete) {
        this.logger.info({ app: app.name, uuid: app.uuid }, "Deleting resource");
        await this.client.deleteApplication(app.uuid);
        results.push({
          name: app.name,
          action: "pruned",
          uuid: app.uuid,
        });
      }
    }

    return results;
  }

  /**
   * Reconciles a single resource.
   */
  private async reconcileResource(
    resource: Resource,
    serverId: string,
    environmentUuid: string,
    environmentId: number,
    envVars: CoolifyEnvVar[],
  ): Promise<ReconcileResourceResult> {
    const { name } = resource;
    const { manifest, dockerTag } = this.options;

    this.logger.info({ resource: resource.name, dockerTag }, "Reconciling resource");

    // Try to find existing application
    const existingApp = await this.client.findApplicationByName(name, environmentId);

    try {
      if (existingApp) {
        // App exists, update it
        this.logger.info({ app: name }, `Application already exists, updating...`);
        const updateOptions = CoolifyClient.buildUpdateOptions(resource, dockerTag);
        await this.client.updateApplication(existingApp.uuid, updateOptions);

        // Reconcile env vars (prune and update)
        await this.reconcileEnvironmentVariables(existingApp.uuid, envVars);

        // Trigger deployment
        const deploymentUuid = await this.client.deployApplication(existingApp.uuid);
        if (deploymentUuid) {
          this.logger.info({ app: name, deploymentUuid }, "Deployment triggered");
        }

        return {
          name: name,
          action: "updated",
          uuid: existingApp.uuid,
          deploymentUuid: deploymentUuid ?? undefined,
        };
      } else {
        // App doesn't exist, create it
        this.logger.info({ app: name }, `Application does not exist, creating...`);

        const createOptions = CoolifyClient.buildCreateOptions(
          resource,
          manifest.projectId,
          serverId,
          manifest.environmentName,
          environmentUuid,
          manifest.destinationId,
          dockerTag,
        );
        const newApp = await this.client.createDockerImageApplication(createOptions);

        // Update env vars if they are provided
        if (envVars.length > 0) {
          await this.client.updateEnvironmentVariables(newApp.uuid, envVars);
        }

        // Trigger deployment
        const deploymentUuid = await this.client.deployApplication(newApp.uuid);
        if (deploymentUuid) {
          this.logger.info({ app: name, deploymentUuid }, "Deployment triggered");
        }

        return {
          name: name,
          action: "created",
          uuid: newApp.uuid,
          deploymentUuid: deploymentUuid ?? undefined,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error({ resource: resource.name, error: errorMessage }, "Failed to reconcile resource");
      return {
        name: resource.name,
        action: "failed",
        error: errorMessage,
      };
    }
  }
}
