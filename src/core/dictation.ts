/** Nova-3 monolingual language codes, including documented locale aliases.
 * Source: https://developers.deepgram.com/docs/models-languages-overview
 * Multilingual is a separate mode; its supported language set differs.
 */
const NOVA_3_LANGUAGES = [
	["南非荷兰语", ["af", "af-ZA"]],
	["阿拉伯语", ["ar", "ar-AE", "ar-SA", "ar-QA", "ar-KW", "ar-SY", "ar-LB", "ar-PS", "ar-JO", "ar-EG", "ar-SD", "ar-TD", "ar-MA", "ar-DZ", "ar-TN", "ar-IQ", "ar-IR"]],
	["亚美尼亚语", ["hy"]],
	["阿萨姆语", ["as", "as-IN"]],
	["白俄罗斯语", ["be"]],
	["孟加拉语", ["bn"]],
	["波斯尼亚语", ["bs"]],
	["保加利亚语", ["bg"]],
	["加泰罗尼亚语", ["ca"]],
	["中文（粤语，繁体）", ["zh-HK"]],
	["中文（普通话，简体）", ["zh", "zh-CN", "zh-Hans"]],
	["中文（普通话，繁体）", ["zh-TW", "zh-Hant"]],
	["克罗地亚语", ["hr"]],
	["捷克语", ["cs", "cs-CZ"]],
	["丹麦语", ["da", "da-DK"]],
	["荷兰语", ["nl"]],
	["英语", ["en", "en-US", "en-AU", "en-GB", "en-IN", "en-NZ"]],
	["爱沙尼亚语", ["et"]],
	["芬兰语", ["fi"]],
	["弗拉芒语", ["nl-BE"]],
	["法语", ["fr", "fr-CA"]],
	["格鲁吉亚语", ["ka", "ka-GE"]],
	["德语", ["de"]],
	["德语（瑞士）", ["de-CH"]],
	["希腊语", ["el"]],
	["古吉拉特语", ["gu", "gu-IN"]],
	["希伯来语", ["he"]],
	["印地语", ["hi"]],
	["匈牙利语", ["hu"]],
	["印度尼西亚语", ["id"]],
	["意大利语", ["it"]],
	["日语", ["ja"]],
	["卡纳达语", ["kn"]],
	["哈萨克语", ["kk", "kk-KZ"]],
	["韩语", ["ko", "ko-KR"]],
	["拉脱维亚语", ["lv"]],
	["立陶宛语", ["lt"]],
	["马其顿语", ["mk"]],
	["马来语", ["ms"]],
	["马拉地语", ["mr"]],
	["蒙古语", ["mn"]],
	["尼泊尔语", ["ne"]],
	["挪威语", ["no"]],
	["普什图语", ["ps", "ps-AF"]],
	["波斯语", ["fa"]],
	["波兰语", ["pl"]],
	["葡萄牙语", ["pt", "pt-BR", "pt-PT"]],
	["旁遮普语", ["pa", "pa-IN"]],
	["罗马尼亚语", ["ro"]],
	["俄语", ["ru"]],
	["塞尔维亚语", ["sr"]],
	["斯洛伐克语", ["sk"]],
	["斯洛文尼亚语", ["sl"]],
	["西班牙语", ["es", "es-419"]],
	["瑞典语", ["sv", "sv-SE"]],
	["他加禄语", ["tl"]],
	["泰米尔语", ["ta"]],
	["泰卢固语", ["te"]],
	["泰语", ["th", "th-TH"]],
	["土耳其语", ["tr", "tr-TR"]],
	["乌克兰语", ["uk"]],
	["乌尔都语", ["ur"]],
	["越南语", ["vi"]],
] as const;

export type DictationLanguage = "multi" | (typeof NOVA_3_LANGUAGES)[number][1][number];

export const DICTATION_LANGUAGES: readonly { code: DictationLanguage; label: string }[] = [
	{ code: "multi", label: "多语言自动识别" },
	...NOVA_3_LANGUAGES.flatMap(([name, codes]) =>
		codes.map((code, i) => ({ code, label: i === 0 ? name : `${name} (${code})` })),
	).sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
];

export function isDictationLanguage(value: unknown): value is DictationLanguage {
	return DICTATION_LANGUAGES.some(({ code }) => code === value);
}

/** Only language varies. Keep the owner's tuned streaming parameters. */
export function deepgramListenUrl(language: DictationLanguage): string {
	return "wss://api.deepgram.com/v1/listen" +
		"?model=nova-3&encoding=linear16&sample_rate=16000&channels=1" +
		"&smart_format=true&punctuate=true&endpointing=300" +
		`&language=${encodeURIComponent(language)}`;
}
