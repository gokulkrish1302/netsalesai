import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "app_info",
  title: "App info",
  description:
    "Return public metadata about NetApp Sales Intelligence: what the app does and what capabilities it exposes over MCP.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            name: "NetApp Sales Intelligence",
            description:
              "Sales intelligence and account-scoring workspace for NetApp sales reps. Per-rep account, pipeline, and action-plan data is protected by row-level security and is NOT exposed over this MCP server.",
            publicCapabilities: ["echo", "app_info"],
            note: "For per-user data access, this app would need an OAuth-authenticated MCP server; the current server is public and exposes only non-sensitive utility tools.",
          },
          null,
          2,
        ),
      },
    ],
  }),
});
