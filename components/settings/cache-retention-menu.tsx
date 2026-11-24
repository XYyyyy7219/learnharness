"use client";

import type { CacheRetention } from "@earendil-works/pi-ai";

const OPTIONS = [
	{ value: undefined, compact: "默认", label: "Pi 默认值", description: "保持未设置，使用 Pi 默认行为或环境变量中的设置。" },
	{ value: "none", compact: "不请求", label: "不主动请求缓存", description: "使用 Pi 的 none 选项。服务商仍可能自动缓存。" },
	{ value: "short", compact: "短期", label: "短期保留", description: "使用 Pi 的 short 选项。实际时长取决于服务商与模型。" },
	{ value: "long", compact: "长期", label: "长期保留", description: "使用 Pi 的 long 选项。缓存写入费用可能较高。" },
] as const;

export function cacheRetentionLabel(value: CacheRetention | undefined): string {
	return `缓存：${OPTIONS.find((option) => option.value === value)!.compact}`;
}

export function CacheRetentionMenu({ value, onPick }: {
	value: CacheRetention | undefined;
	onPick: (value: CacheRetention | undefined) => void;
}) {
	return <>
		<div className="border-b border-border px-2 pb-2">
			<p className="text-card-foreground">缓存保留时间</p>
			<p className="mt-1 text-muted-foreground">设置发送给 Pi 的缓存保留偏好。支持情况和时长取决于服务商与模型，实际缓存命中由服务商决定。</p>
		</div>
		{OPTIONS.map((option) => <button
			key={option.value ?? "default"}
			type="button"
			data-testid={`cache-retention-option-${option.value ?? "default"}`}
			aria-pressed={value === option.value}
			onClick={() => onPick(option.value)}
			className={`rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted ${value === option.value ? "bg-muted/60" : ""}`}
		>
			<span className="flex justify-between gap-2 text-card-foreground"><span>{option.label}</span>{value === option.value && <span aria-hidden>✓</span>}</span>
			<span className="mt-1 block text-muted-foreground">{option.description}</span>
		</button>)}
	</>;
}
