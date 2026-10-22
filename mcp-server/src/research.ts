import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type CompanyBrief = {
  company: string;
  website: string;
  summary: string;
  industry: string;
  size: string;
  headquarters: string;
  uses_salesforce: string;
  recent_news: string[];
  talking_points: string[];
  person_profile_url: string;
  sources: string[];
};

const FIELDS = `{
  "company": "official company name",
  "website": "main website URL",
  "summary": "two sentences on what the company does",
  "industry": "",
  "size": "approximate employee count or revenue band, if found",
  "headquarters": "city, region",
  "uses_salesforce": "yes, no, or unknown, with a short reason",
  "recent_news": ["up to 3 items from the last 12 months, one line each"],
  "talking_points": ["2 or 3 short conversation openers for a booth follow-up"],
  "person_profile_url": "the person's LinkedIn profile URL, only if you found it with confidence",
  "sources": ["URLs you used"]
}`;

function prompt(company: string, personName?: string, personTitle?: string): string {
  const person = personName
    ? `\nWe met ${personName}${personTitle ? `, ${personTitle},` : ""} from this company. Look for their public LinkedIn profile. Only report it if the name and company both match.`
    : "";
  return `Research the company "${company}" for a sales team following up after a trade show booth conversation.${person}

Search the web. Be brief and factual. Use "" or [] for anything you cannot confirm. Never invent facts or URLs.

Reply with only this JSON object and no other text:
${FIELDS}`;
}

// Pull the JSON object out of the final text, tolerating a stray sentence or code fence.
function parseBrief(text: string): CompanyBrief | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as CompanyBrief;
  } catch {
    return null;
  }
}

export async function researchCompany(
  company: string,
  personName?: string,
  personTitle?: string,
): Promise<{ brief: CompanyBrief | null; text: string }> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: prompt(company, personName, personTitle) },
  ];

  // Web search runs on Anthropic's servers. A long search can pause the turn; resume it a few times at most.
  let response: Anthropic.Beta.BetaMessage | undefined;
  for (let i = 0; i < 4; i++) {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages,
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (!response) throw new Error("No response from Claude.");
  if (response.stop_reason === "refusal") throw new Error("Claude declined to research this company.");

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { brief: parseBrief(text), text };
}
