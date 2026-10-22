# Hold My Prompt! Ep 1: _TITLE_

Stream: _STREAM LINK_

We build a booth lead-capture system live, from scratch, in about two hours.

## What we built

_WHAT WE BUILT_

## Repo layout

| Path | Contents |
| --- | --- |
| `mcp-server/` | The MCP server. Render deploys it on every push. |
| `booth-app/` | `index.html`, the booth app that we publish as a Claude Artifact. |
| `skills/qualify-lead/` | The Skill that scores a lead with the team's rules. |
| `skills/draft-followup/` | The Skill that drafts a follow-up in the team's voice. |
| `skills/show-recap/` | The Skill that writes the Monday recap. |
| `render.yaml` | The Render configuration for `mcp-server/`. |

The end of the live stream has the tag `ep01-live`. Fixes come after that tag.
