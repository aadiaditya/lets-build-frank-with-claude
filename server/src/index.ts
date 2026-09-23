import { createApp } from "./app.js";
import { config } from "./config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Frank ${config.version} listening on :${config.port} — MCP at POST /mcp`);
  if (config.azure.resourceGroup) {
    console.log(`Azure scope: ${config.azure.resourceGroup}`);
  }
});
