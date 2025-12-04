/**
 * Coolify Proxy settings structure.
 */
export interface CoolifyProxy {
  type: string;
  status: string;
  redirect_enabled: boolean;
  last_saved_settings: string;
  last_applied_settings: string;
  force_stop: boolean;
  redirect_url: string | null;
}

/**
 * Coolify Server settings structure.
 */
export interface CoolifySettings {
  id: number;
  is_swarm_manager: boolean;
  is_jump_server: boolean;
  is_build_server: boolean;
  is_reachable: boolean;
  is_usable: boolean;
  server_id: number;
  created_at: Date;
  updated_at: Date;
  wildcard_domain: string;
  is_cloudflare_tunnel: boolean;
  is_logdrain_newrelic_enabled: boolean;
  logdrain_newrelic_license_key: string | null;
  logdrain_newrelic_base_uri: string | null;
  is_logdrain_highlight_enabled: boolean;
  logdrain_highlight_project_id: string | null;
  is_logdrain_axiom_enabled: boolean;
  logdrain_axiom_dataset_name: string | null;
  logdrain_axiom_api_key: string | null;
  is_swarm_worker: boolean;
  is_logdrain_custom_enabled: boolean;
  logdrain_custom_config: string;
  logdrain_custom_config_parser: string;
  concurrent_builds: number;
  dynamic_timeout: number;
  force_disabled: boolean;
  is_metrics_enabled: boolean;
  generate_exact_labels: boolean;
  force_docker_cleanup: boolean;
  docker_cleanup_frequency: string;
  docker_cleanup_threshold: number;
  server_timezone: string;
  delete_unused_volumes: boolean;
  delete_unused_networks: boolean;
  is_sentinel_enabled: boolean;
  sentinel_token: string;
  sentinel_metrics_refresh_rate_seconds: number;
  sentinel_metrics_history_days: number;
  sentinel_push_interval_seconds: number;
  sentinel_custom_url: string;
  server_disk_usage_notification_threshold: number;
  is_sentinel_debug_enabled: boolean;
  server_disk_usage_check_frequency: string;
  is_terminal_enabled: boolean;
}

/**
 * Coolify Server response structure.
 */
export interface CoolifyServer {
  id: number;
  uuid: string;
  name: string;
  description: string;
  ip: string;
  port: number;
  user: string;
  team_id: number;
  private_key_id: number;
  proxy: CoolifyProxy;
  created_at: Date;
  updated_at: Date;
  unreachable_notification_sent: boolean;
  unreachable_count: number;
  high_disk_usage_notification_sent: boolean;
  log_drain_notification_sent: boolean;
  swarm_cluster: string | null;
  validation_logs: string | null;
  sentinel_updated_at: Date;
  deleted_at: Date | null;
  ip_previous: string;
  hetzner_server_id: string | null;
  cloud_provider_token_id: string | null;
  hetzner_server_status: string | null;
  is_validating: boolean;
  detected_traefik_version: string;
  traefik_outdated_info: string | null;
  is_coolify_host: boolean;
  settings: CoolifySettings;
}

/**
 * Coolify Destination response structure
 */
export interface CoolifyDestination {
  id: number;
  name: string;
  uuid: string;
  network: string;
  server_id: number;
  created_at: Date;
  updated_at: Date;
  server: CoolifyServer;
}

/**
 * Coolify Application response structure
 */
export interface CoolifyApplication {
  id: number;
  uuid: string;
  name: string;
  description: string | null;
  repository_project_id: number | null;
  fqdn: string | null;
  config_hash: string;
  git_repository: string | null;
  git_branch: string | null;
  git_commit_sha: string | null;
  git_full_url: string | null;
  docker_registry_image_name: string;
  docker_registry_image_tag: string;
  build_pack: string;
  static_image: string | null;
  install_command: string | null;
  build_command: string | null;
  start_command: string | null;
  ports_exposes: string | null;
  ports_mappings: string | null;
  custom_network_aliases: string | null;
  base_directory: string;
  publish_directory: string | null;
  health_check_enabled: boolean;
  health_check_path: string | null;
  health_check_port: string | null;
  health_check_host: string | null;
  health_check_method: string | null;
  health_check_return_code: number | null;
  health_check_scheme: string | null;
  health_check_response_text: string | null;
  health_check_interval: number | null;
  health_check_timeout: number | null;
  health_check_retries: number | null;
  health_check_start_period: number | null;
  limits_memory: string | null;
  limits_memory_swap: string | null;
  limits_memory_swappiness: number | null;
  limits_memory_reservation: string | null;
  limits_cpus: string | null;
  limits_cpuset: string | null;
  limits_cpu_shares: number | null;
  status: string | null;
  preview_url_template: string | null;
  destination_type: string;
  destination_id: number;
  destination: CoolifyDestination;
  source_id: number;
  private_key_id: number;
  environment_id: number;
  dockerfile: string;
  dockerfile_location: string;
  custom_labels: string | null;
  dockerfile_target_build: string | null;
  manual_webhook_secret_github: string | null;
  manual_webhook_secret_gitlab: string | null;
  manual_webhook_secret_bitbucket: string | null;
  manual_webhook_secret_gitea: string | null;
  docker_compose_location: string | null;
  docker_compose: string | null;
  docker_compose_raw: string | null;
  docker_compose_domains: string | null;
  docker_compose_custom_start_command: string | null;
  docker_compose_custom_build_command: string | null;
  swarm_replicas: number | null;
  swarm_placement_constraints: string | null;
  custom_docker_run_options: string | null;
  post_deployment_command: string | null;
  post_deployment_command_container: string | null;
  pre_deployment_command: string | null;
  pre_deployment_command_container: string | null;
  watch_paths: string | null;
  custom_healthcheck_found: boolean;
  redirect: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
  compose_parsing_version: string | null;
  custom_nginx_configuration: string | null;
  is_http_basic_auth_enabled: boolean;
  http_basic_auth_username: string | null;
  http_basic_auth_password: string | null;
}

/**
 * Options for creating a new Coolify Docker Image application.
 */
export interface CoolifyCreateDockerImageAppOptions {
  project_uuid: string;
  server_uuid: string;
  environment_name: string;
  environment_uuid: string;
  docker_registry_image_name: string;
  docker_registry_image_tag?: string;
  ports_exposes?: string;
  destination_uuid?: string;
  name?: string;
  description?: string;
  domains?: string;
  ports_mappings?: string;
  health_check_enabled?: boolean;
  health_check_path?: string;
  health_check_port?: string;
  health_check_host?: string;
  health_check_method?: string;
  health_check_return_code?: number;
  health_check_scheme?: string;
  health_check_response_text?: string;
  health_check_interval?: number;
  health_check_timeout?: number;
  health_check_retries?: number;
  health_check_start_period?: number;
  limits_memory?: string;
  limits_memory_swap?: string;
  limits_memory_swappiness?: number;
  limits_memory_reservation?: string;
  limits_cpus?: string;
  limits_cpuset?: string;
  limits_cpu_shares?: number;
  custom_labels?: string;
  custom_docker_run_options?: string;
  post_deployment_command?: string;
  post_deployment_command_container?: string;
  pre_deployment_command?: string;
  pre_deployment_command_container?: string;
  manual_webhook_secret_github?: string;
  manual_webhook_secret_gitlab?: string;
  manual_webhook_secret_bitbucket?: string;
  manual_webhook_secret_gitea?: string;
  redirect?: string;
  instant_deploy?: boolean;
  use_build_server?: boolean;
  is_http_basic_auth_enabled?: boolean;
  http_basic_auth_username?: string;
  http_basic_auth_password?: string;
  connect_to_docker_network?: boolean;
  force_domain_override?: boolean;
}

/**
 * Options for updating an existing Coolify application.
 */
export interface CoolifyUpdateAppOptions {
  project_uuid?: string;
  server_uuid?: string;
  environment_name?: string;
  github_app_uuid?: string;
  git_repository?: string;
  git_branch?: string;
  ports_exposes?: string;
  destination_uuid?: string;
  build_pack?: string;
  name?: string;
  description?: string;
  domains?: string;
  git_commit_sha?: string;
  docker_registry_image_name?: string;
  docker_registry_image_tag?: string;
  is_static?: boolean;
  install_command?: string;
  build_command?: string;
  start_command?: string;
  ports_mappings?: string;
  base_directory?: string;
  publish_directory?: string;
  health_check_enabled?: boolean;
  health_check_path?: string;
  health_check_port?: string;
  health_check_host?: string;
  health_check_method?: string;
  health_check_return_code?: number;
  health_check_scheme?: string;
  health_check_response_text?: string;
  health_check_interval?: number;
  health_check_timeout?: number;
  health_check_retries?: number;
  health_check_start_period?: number;
  limits_memory?: string;
  limits_memory_swap?: string;
  limits_memory_swappiness?: number;
  limits_memory_reservation?: string;
  limits_cpus?: string;
  limits_cpuset?: string;
  limits_cpu_shares?: number;
  custom_labels?: string;
  custom_docker_run_options?: string;
  post_deployment_command?: string;
  post_deployment_command_container?: string;
  pre_deployment_command?: string;
  pre_deployment_command_container?: string;
  manual_webhook_secret_github?: string;
  manual_webhook_secret_gitlab?: string;
  manual_webhook_secret_bitbucket?: string;
  manual_webhook_secret_gitea?: string;
  redirect?: string;
  instant_deploy?: boolean;
  dockerfile?: string;
  docker_compose_location?: string;
  docker_compose_raw?: string;
  docker_compose_custom_start_command?: string;
  docker_compose_custom_build_command?: string;
  docker_compose_domains?: string;
  watch_paths?: string;
  use_build_server?: boolean;
  connect_to_docker_network?: boolean;
  force_domain_override?: boolean;
}

/**
 * Coolify Create/Update Application response structure.
 */
export interface CoolifyCreateUpdateAppResponse {
  uuid: string;
}

/**
 * Coolify Environment response structure.
 */
export interface CoolifyEnvironment {
  id: number;
  uuid: string;
  name: string;
}

/**
 * Coolify environment variable structure.
 */
export interface CoolifyEnvVar {
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
}

/**
 * Coolify environment variable response structure.
 */
export interface CoolifyEnvVarResponse extends CoolifyEnvVar {
  uuid: string;
}

/**
 * Coolify API error response structure.
 */
export interface CoolifyApiError {
  message: string;
}

/**
 * Coolify Initiate Deploy response structure.
 */
export interface CoolifyInitiateDeployResponse {
  deployments: {
    message: string;
    resource_uuid: string;
    deployment_uuid: string;
  }[];
}

/**
 * Coolify Deploy response structure.
 */
export interface CoolifyDeployResponse {
  id: number;
  application_id: string;
  deployment_uuid: string;
  pull_request_id: number;
  force_rebuild: boolean;
  commit: string;
  status: string;
  is_webhook: boolean;
  is_api: boolean;
  created_at: string;
  updated_at: string;
  logs: string;
  current_process_id: string;
  restart_only: boolean;
  git_type: string;
  server_id: number;
  application_name: string;
  server_name: string;
  deployment_url: string;
  destination_id: string;
  only_this_server: boolean;
  rollback: boolean;
  commit_message: string;
}
