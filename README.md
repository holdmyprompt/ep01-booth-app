# Hold My Prompt! Ep 1: Booth Leads

Stream: _STREAM LINK_

We build a booth lead-capture system live, from scratch, in about two hours.

## What we built

A booth crew scans badges and business cards on a phone, rates each lead, adds quick tags and notes, and researches the company. Every lead is shared with the whole crew in real time.

| Part | Where it runs | What it does |
| --- | --- | --- |
| `booth-app/index.html` | A published Claude Artifact on claude.ai | Reads badge photos with Claude, saves leads to the artifact's shared database, shows who added each lead and who is on the floor. |
| `mcp-server/` | Render, as the `ep01-mcp-server` web service | An MCP server with one tool, `research_company`. It uses Claude with web search to write a short company brief and find the person's LinkedIn profile. |
| `skills/` | Claude | Plain-instruction Skills for qualifying leads, drafting follow-ups, and the post-show recap. |
| `test-cards/` | Nowhere | Sample badge and card photos for testing, including blurry and sideways ones. |

Leads live in the artifact's database, not on the MCP server. The server keeps no data.

## Run the MCP server locally

You need Node 20 or later.

```
cd mcp-server
npm install
npm run build
ANTHROPIC_API_KEY=... MCP_AUTH_TOKEN=... npm start
```

The server listens on `PORT` (default 3000). `GET /healthz` returns `{"ok": true}`. The MCP endpoint is `POST /mcp`.

## Configuration

Set these on the Render service, never in git.

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Yes | Pays for research calls. |
| `MCP_AUTH_TOKEN` | Yes | Shared secret. Without it, anyone with the URL can run research. |
| `MAX_CALLS_PER_HOUR` | No | Research call limit for everyone together. Default 60. |

If you change a variable on Render, make sure that the service redeploys. When the token is loaded, the startup log line says `x-api-key auth on`.

## Connect the research tool to Claude

In claude.ai, open Settings, then Connectors, and add a custom connector:

- URL: `https://ep01-mcp-server.onrender.com/mcp`
- Header `x-api-key`, with the value of `MCP_AUTH_TOKEN` and nothing in front of it.
- Name it `The Booth App`. The booth page calls the connector by this exact name.

Each crew member adds the connector in their own Claude account.

## Repo layout

| Path | Contents |
| --- | --- |
| `mcp-server/` | The MCP server. Deploy with `render deploys create <service id>`. Auto-deploy from GitHub is not connected. |
| `booth-app/` | `index.html`, the booth app that we publish as a Claude Artifact. |
| `skills/qualify-lead/` | The Skill that scores a lead with the team's rules. |
| `skills/draft-followup/` | The Skill that drafts a follow-up in the team's voice. |
| `skills/show-recap/` | The Skill that writes the Monday recap. |
| `test-cards/` | Sample badge and card photos. |
| `render.yaml` | The Render configuration for `mcp-server/`. |

The end of the live stream has the tag `ep01-live`. Fixes come after that tag.
