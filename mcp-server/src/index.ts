import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { researchCompany } from "./research.js";

const PORT = Number(process.env.PORT) || 3000;
// Optional secret path segment, so the public URL alone cannot spend our API credits.
const PATH_TOKEN = process.env.MCP_PATH_TOKEN || "";
// Simple spend guard: at most this many research calls per hour across everyone.
const MAX_CALLS_PER_HOUR = Number(process.env.MAX_CALLS_PER_HOUR) || 60;

const callTimes: number[] = [];
function underLimit(): boolean {
  const hourAgo = Date.now() - 3_600_000;
  while (callTimes.length && callTimes[0] < hourAgo) callTimes.shift();
  if (callTimes.length >= MAX_CALLS_PER_HOUR) return false;
  callTimes.push(Date.now());
  return true;
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "booth-leads", version: "0.1.0" });

  server.registerTool(
    "research_company",
    {
      title: "Research a company",
      description:
        "Researches a company on the web for a booth lead follow-up. Returns JSON with website, summary, industry, size, headquarters, whether they use Salesforce, recent news, talking points, sources, and, when a person name is given, their LinkedIn profile URL if found. Takes 20 to 60 seconds.",
      inputSchema: {
        company: z.string().min(1).max(200).describe("Company name as printed on the badge or card"),
        person_name: z.string().max(200).optional().describe("Name of the person we met, to look for their LinkedIn profile"),
        person_title: z.string().max(200).optional().describe("Their job title, to confirm the right profile"),
      },
    },
    async ({ company, person_name, person_title }) => {
      if (!underLimit()) {
        return { isError: true, content: [{ type: "text", text: "Research limit reached for this hour. Try again later." }] };
      }
      try {
        const { brief, text } = await researchCompany(company, person_name, person_title);
        return { content: [{ type: "text", text: brief ? JSON.stringify(brief, null, 2) : text }] };
      } catch (err) {
        console.error("research_company failed:", err);
        return { isError: true, content: [{ type: "text", text: "Research failed. Try again in a minute." }] };
      }
    },
  );

  return server;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true });
});

// Stateless Streamable HTTP: a fresh server and transport per request.
const mcpPath = PATH_TOKEN ? `/mcp/${PATH_TOKEN}` : "/mcp";
app.post(mcpPath, async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
    }
  }
});

// Stateless mode has no server-sent stream or session to end.
app.all(mcpPath, (_req, res) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null });
});

app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}${PATH_TOKEN ? " (secret path on)" : " at /mcp"}`);
});
