import pino from "pino";
import type { Env } from "./env";

const SERVICE_NAME = "coolify-deploy";

/**
 * Creates a structured pino logger for the tool.
 * Outputs JSON to stdout for integration with log aggregation systems.
 */
export function createLogger(env: Env): pino.Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: SERVICE_NAME,
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type Logger = pino.Logger;
