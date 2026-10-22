# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is the build for Hold My Prompt! Episode 1, a live stream. The team builds a booth lead-capture system from scratch on camera in about two hours. Before the stream, the folders are empty on purpose. Do not write MCP tool code, the booth page, or SKILL.md files until the user says the stream is live. Do not add sample leads, because the page must work with an empty lead list on air.

The plan and the run of show are in the prep doc: https://claude.ai/artifact/9GJD9qcAWozvuEU4o1dn9S. Read it with the Claude Docs tools, not with a web fetch.

## Architecture

The system has three parts. They connect only through this public GitHub repo and the Claude Artifact runtime.

- `mcp-server/` is a TypeScript MCP server that uses the official MCP TypeScript SDK. Render deploys it on every push to `main`. It is stateless: each tool takes a lead in and returns an answer. The first tool is `research_company`, which uses Claude and web search. Leads are never stored on the server.
- `booth-app/index.html` is one HTML file that Claude web publishes as a Claude Artifact. It scans badges and cards, saves leads, attaches notes, and tags leads hot, warm, or cold.
- `skills/{qualify-lead,draft-followup,show-recap}/SKILL.md` are plain-instruction Skills with no scripts. The same file runs in Claude chat and inside the booth page, so one edit changes both.

The deploy loop is: Claude Code pushes, Render redeploys the server, and Claude web reads the raw file from `raw.githubusercontent.com` and publishes the page. The repo must stay public for this to work.

Build the MCP server first. Claude web must see one real call and response from each MCP tool before any page code calls that tool.

## Booth page runtime rules

The published Artifact runtime is different from a normal browser page.

- Get each feature with `await claude.use("<name>")`. If the feature is not available, it returns `null`, so every caller must handle `null`.
- At publish time, the page declares these capabilities: `sample` (with images), `db`, `user`, `room`, and `mcp` (our server and the Slack connector).
- `sample` is the page's built-in Claude. It reads badge photos. It has no memory, no web search, and it cannot run Skills. It can call page functions as tools, and a page function can call the MCP server.
- `fetch("https://api.anthropic.com/...")` and `window.storage` do not work on a published page. Use `sample` and `db`.
- Load external scripts only from cdnjs, jsDelivr, the Tailwind CDN, or code.jquery.com, and pin each one to an exact version.
- For the camera, use `<input type="file" accept="image/*" capture="environment">`, not a live video feed.
- When the page parses a badge, ask Claude for JSON only and remove stray code fences before parsing. Test with blurry, sideways, and no-email badges.
- Every person who opens the page can see all leads in `db`.

## Commands

The server has no code yet. `render.yaml` expects `mcp-server/package.json` to provide `npm run build` and `npm start`, and to read `ANTHROPIC_API_KEY` from the environment. When you write the server, keep those names.

```
render blueprints validate ./render.yaml   # check the Render configuration
git tag ep01-live                          # mark the end of the live stream
```

## On camera

This repo is built live on a stream. Never print, `cat`, or echo `.env` files or keys. The Anthropic key exists only in the Render environment settings.

Git in this folder commits as the `holdmyprompt` GitHub user. The remote is `holdmyprompt/ep01-booth-app`.
