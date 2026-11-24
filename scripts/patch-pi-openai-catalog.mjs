import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// OpenAI Responses entries from the published @earendil-works/pi-ai 1.6.0
// catalog. Keep Pi 1.5.2 and backport only these two models.
const common = {
	api: "openai-responses",
	provider: "openai",
	baseUrl: "https://api.openai.com/v1",
	reasoning: true,
	input: [
		"text",
		"image"
	],
	contextWindow: 272000,
	maxTokens: 128000,
	thinkingLevelMap: {
		off: null,
		minimal: null,
		low: "low",
		medium: "medium",
		high: "high",
		xhigh: "xhigh",
		max: "max"
	},
	compat: {
		supportsStrictMode: true,
		supportsOpenAIGrammarTools: true,
		supportsAdditionalTools: true,
		supportsToolSearch: true,
		supportsMidConvoSystemMessages: true,
		supportsExplicitPromptCacheMode: true,
		supportsMidConvoEffort: true
	},
	inputLimits: {
		maxRequestBytes: 536870912,
		images: {
			maxPerRequest: 1500,
			resize: {
				maxWidth: 2000,
				maxHeight: 2000,
				maxBytes: 4718592,
				jpegQuality: 80
			}
		}
	},
	type: "chat"
};
const additions = [
	{
		...common,
		id: "gpt-6.2-sol",
		name: "GPT-6.2 Sol",
		cost: {
			input: 2,
			output: 10,
			cacheRead: 0.1,
			cacheWrite: 2.5,
			tiers: [
				{
					inputTokensAbove: 272000,
					input: 4,
					output: 15,
					cacheRead: 0.2,
					cacheWrite: 5
				}
			]
		},
	},
	{
		...common,
		id: "gpt-6.2-astra",
		name: "GPT-6.2 Astra",
		cost: {
			input: 8,
			output: 40,
			cacheRead: 0.4,
			cacheWrite: 10,
			tiers: [
				{
					inputTokensAbove: 272000,
					input: 16,
					output: 60,
					cacheRead: 0.8,
					cacheWrite: 20
				}
			]
		},
	},
];

const defaultPath = fileURLToPath(new URL(
	"../node_modules/@earendil-works/pi-ai/dist/providers/data/openai.json",
	import.meta.url,
));
const catalogPath = process.argv[2] ?? defaultPath;
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const responses = catalog["openai-responses"];
if (!responses || typeof responses !== "object" || Array.isArray(responses)) {
	throw new Error("Pi's OpenAI Responses catalog has an unexpected format.");
}

const missing = additions.filter((model) => !Object.hasOwn(responses, `chat:${model.id}`));
if (missing.length) {
	for (const model of missing) responses[`chat:${model.id}`] = model;

	const staged = `${catalogPath}.gpt62-${randomUUID()}.tmp`;
	await writeFile(staged, JSON.stringify(catalog) + "\n", { flag: "wx" });
	try {
		await rename(staged, catalogPath);
	} catch (error) {
		await unlink(staged);
		throw error;
	}
	console.log(`Added to Pi's OpenAI Responses catalog: ${missing.map(({ id }) => id).join(", ")}`);
}
