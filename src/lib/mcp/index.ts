import { defineMcp } from "@lovable.dev/mcp-js";
import appInfoTool from "./tools/app_info";
import echoTool from "./tools/echo";

export default defineMcp({
  name: "netapp-sales-intelligence-mcp",
  title: "NetApp Sales Intelligence MCP",
  version: "0.1.0",
  instructions:
    "Public MCP server for NetApp Sales Intelligence. Exposes non-sensitive utility tools only: `echo` to verify connectivity and `app_info` to describe the app. Per-rep sales data is protected by row-level security and is not accessible through this server.",
  tools: [echoTool, appInfoTool],
});
