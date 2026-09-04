import { readFile } from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitCommand } from "./program";

vi.mock("node:fs/promises");
vi.mock("node:child_process");

const mockedReadFile = vi.mocked(readFile);

describe("Program - Init Command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadFile.mockResolvedValue(JSON.stringify({ version: "1.0.0" }));
  });

  it("should expose a server-uuid alias for the server-id option", async () => {
    const { createProgram } = await import("./program");
    const program = await createProgram();
    expect(program.options.some((opt) => opt.long === "--server-id")).toBe(true);
    expect(program.options.some((opt) => opt.long === "--server-uuid")).toBe(true);
  });

  it("should normalize workspace names into valid COOLIFY_ENV_* secret names", async () => {
    const { toCoolifyEnvSecretName } = await import("./program");
    expect(toCoolifyEnvSecretName("my-app")).toBe("COOLIFY_ENV_MY_APP");
    expect(toCoolifyEnvSecretName("my app")).toBe("COOLIFY_ENV_MY_APP");
    expect(toCoolifyEnvSecretName("my/app@v2")).toBe("COOLIFY_ENV_MY_APP_V2");
  });

  it("should parse options for project ID and environment", async () => {
    const command = createInitCommand();

    // Verify options are properly defined
    const options = command.opts();
    expect(options).toBeDefined();

    // The command should have output option defined
    const outputOption = command.options.find((opt) => opt.long === "--output");
    expect(outputOption).toBeDefined();

    // The command should have project-id option defined
    const projectIdOption = command.options.find((opt) => opt.long === "--project-id");
    expect(projectIdOption).toBeDefined();

    // The command should have environment option defined
    const envOption = command.options.find((opt) => opt.long === "--environment");
    expect(envOption).toBeDefined();
  });

  it("should have description for init command", () => {
    const command = createInitCommand();
    expect(command.description()).toBe("Initialize a new coolify.manifest.json by scanning the monorepo");
  });

  it("should handle default option values", () => {
    const command = createInitCommand();
    command.opts();

    // Check that output defaults to ./coolify.manifest.json
    const outputOption = command.options.find((opt) => opt.long === "--output");
    expect(outputOption?.defaultValue).toBe("./coolify.manifest.json");
  });
});
