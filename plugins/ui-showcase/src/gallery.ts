import type {
  PluginFrontendContext, PluginModelValue, PluginThinkingPickerProps, PluginStandardComposerProps,
  PluginSettingsSchema, PluginWidgetHandle,
  PluginThinkingPickerProps as ThinkingProps, PluginButtonProps,
} from "learnharness-plugin-api";
import { Scope, button, element, example, family, note, readout, row } from "./dom.ts";
import { mountOverlayExamples, openPageSurfaceDemo } from "./surfaces.ts";
import { mountTreeDemo } from "./tree.ts";

type Thinking = PluginThinkingPickerProps["value"];
export const FAMILY_IDS = ["pickers", "composer", "dictation", "standard-composer", "buttons", "settings", "markdown", "tree", "worker-results", "menus", "dialogs", "surfaces"] as const;

export function mountGallery(container: HTMLElement, ctx: PluginFrontendContext, signal: AbortSignal): () => void {
  const scope = new Scope(signal);
  if (signal.aborted) return scope.dispose;
  const root = element("div", undefined, "ui-showcase");
  root.dataset.showcase = "gallery";
  container.append(root);
  scope.own(() => root.remove());
  note(root, "宿主界面示例。数值和回调结果仅保存在当前视图，离开后重置。「发送」和「停止」只模拟本地状态。主动开始听写时才会连接已配置的语音服务。");
  const ui = ctx.ui;

  family(ui, root, scope, "pickers", "Pickers", (body, life) => {
    note(body, "模型和推理档位控件使用实际的模型目录。联动选项仅在同一组内变动，应用默认设置保持原样。");
    let model: PluginModelValue | undefined;
    let thinking: Thinking;
    let lastCallback = "none";
    const show = readout(body, "pickers");
    let thinkingPicker: PluginWidgetHandle<ThinkingProps>;
    const modelPicker = life.widget(ui.mountModelPicker(example(body, "model-picker", "Model"), {
      value: model, onChange(value) {
        if (life.signal.aborted) return;
        model = value; thinking = undefined; lastCallback = "model.onChange (thinking cleared)";
        modelPicker.update({ value: model });
        thinkingPicker.update({ model, value: thinking }); render();
      },
    }, { signal: life.signal }));
    thinkingPicker = life.widget(ui.mountThinkingPicker(example(body, "thinking-picker", "此模型的推理档位"), {
      model, value: thinking, onChange(value) {
        if (life.signal.aborted) return;
        thinking = value; lastCallback = "thinking.onChange";
        thinkingPicker.update({ value }); render();
      },
    }, { signal: life.signal }));
    let knowledge: readonly string[] = [];
    note(body, "选择仅用于本演示。宿主选择器中的来源管理操作会作用于真实来源。");
    const knowledgePicker = life.widget(ui.mountKnowledgePicker(example(body, "knowledge-picker", "知识选择"), {
      value: knowledge, onChange(value) {
        if (life.signal.aborted) return;
        knowledge = [...value]; lastCallback = "knowledge.onChange";
        knowledgePicker.update({ value: knowledge }); render();
      },
    }, { signal: life.signal }));
    function render() { show({ model: model ?? null, thinking: thinking ?? null, knowledge, lastCallback }); }
    render();
  });

  family(ui, root, scope, "composer", "Composer", (body, life) => {
    note(body, "点击发送后进入本地忙碌状态，草稿会保留。忙碌时，有草稿即可继续发送引导。清空草稿可显示停止按钮，也可随时点击「完成模拟」。本示例不会发送或保存内容。");
    let value = ""; let busy = false; let sends = 0; let lastCallback = "none";
    const show = readout(body, "composer");
    const composer = life.widget(ui.mountComposer(example(body, "composer", "独立输入框"), {
      value, placeholder: "输入本地草稿", autoFocus: false, canSend: false,
      onChange(next) { if (!life.signal.aborted) { value = next; lastCallback = "onChange"; render(); } },
      onSend() { if (!life.signal.aborted && value.trim()) { busy = true; sends++; lastCallback = "onSend (local simulation)"; render(); } },
      onStop() { if (!life.signal.aborted) { busy = false; lastCallback = "onStop (local simulation)"; render(); } },
    }, { signal: life.signal }));
    const complete = button(ui, body, life, "complete-composer", { label: "完成模拟", disabled: true, variant: "outline", onClick() { busy = false; lastCallback = "simulation completed"; render(); } });
    function render() { composer.update({ value, busy, canSend: !!value.trim() }); complete.update({ disabled: !busy }); show({ draft: value, busy, sends, lastCallback }); }
    render();
  });

  family(ui, root, scope, "dictation", "Dictation", (body, life) => {
    note(body, "点击「听写」或麦克风才会使用已配置的语音服务，音频可能被发送并产生费用。点击完成会等待最后的转录结果，取消只影响此控件的录音。");
    let transcript = ""; let deliveries = 0; let lastCallback = "none";
    const show = readout(body, "dictation");
    const dictation = ui.mountDictation(example(body, "dictation", "宿主听写控件"), {
      onTranscript(text) { if (!life.signal.aborted) { transcript = join(transcript, text); deliveries++; lastCallback = "onTranscript"; render(); } },
    }, { signal: life.signal });
    life.own(() => dictation.dispose());
    const controls = row(body);
    button(ui, controls, life, "dictate", { label: "听写", onClick() { lastCallback = "toggle requested (not recording status)"; render(); dictation.toggle(); } });
    button(ui, controls, life, "finish-dictation", { label: "完成听写", variant: "outline", async onClick() {
      await dictation.finish();
      if (!life.signal.aborted) { lastCallback = "finish resolved after final delivery"; render(); }
    } });
    button(ui, controls, life, "cancel-dictation", { label: "取消听写", variant: "outline", onClick() { dictation.cancel(); lastCallback = "cancel requested"; render(); } });
    function render() { show({ transcript, deliveries, lastCallback }); }
    render();
  });

  family(ui, root, scope, "standard-composer", "标准输入框", (body, life) => {
    note(body, "模型、推理档位与草稿状态彼此独立。发送前会通过宿主 API 等待听写结果，随后进入本地模拟并保留草稿。忙碌时可发送引导，清空草稿可显示停止按钮，也可点击「完成模拟」。主动点击麦克风可能发送音频并产生费用。");
    let value = ""; let model: PluginModelValue | undefined; let thinking: Thinking;
    let busy = false; let sends = 0; let deliveries = 0; let lastCallback = "none"; let lastSent = "";
    const show = readout(body, "standard-composer");
    let composer: PluginWidgetHandle<PluginStandardComposerProps>;
    let complete: PluginWidgetHandle<PluginButtonProps>;
    const props = (): PluginStandardComposerProps => ({
      composer: {
        value, busy, autoFocus: false, placeholder: "独立的本地草稿",
        onChange(next) { if (!life.signal.aborted) { value = next; lastCallback = "composer.onChange"; render(); } },
        onSend() { if (!life.signal.aborted && value.trim()) { lastSent = value; busy = true; sends++; lastCallback = "composer.onSend (after final dictation; local simulation)"; render(); } },
        onStop() { if (!life.signal.aborted) { busy = false; lastCallback = "composer.onStop (local simulation)"; render(); } },
      },
      model: { value: model, onChange(next) { if (!life.signal.aborted) { model = next; thinking = undefined; lastCallback = "model.onChange (thinking cleared)"; render(); } } },
      thinking: { model, value: thinking, onChange(next) { if (!life.signal.aborted) { thinking = next; lastCallback = "thinking.onChange"; render(); } } },
      dictation: { onTranscript(text) { if (!life.signal.aborted) { value = join(value, text); deliveries++; lastCallback = "dictation.onTranscript (draft updated)"; render(); } } },
    });
    composer = life.widget(ui.mountStandardComposer(example(body, "standard-composer", "宿主标准输入框"), props(), { signal: life.signal }));
    complete = button(ui, body, life, "complete-standard-composer", { label: "完成模拟", variant: "outline", disabled: true, onClick() { busy = false; lastCallback = "simulation completed"; render(); } });
    function render() { composer.update(props()); complete.update({ disabled: !busy }); show({ draft: value, model: model ?? null, thinking: thinking ?? null, busy, sends, deliveries, lastSent, lastCallback }); }
    render();
  });

  family(ui, root, scope, "buttons", "Buttons", (body, life) => {
    note(body, "宿主按钮在等待异步回调时不会自动进入等待或禁用样式。本示例中的等待状态和完成控件只在本地生效。");
    let clicks = 0; let lastCallback = "none"; let pending: (() => void) | undefined;
    const show = readout(body, "buttons");
    const variants = row(body);
    for (const variant of ["default", "destructive", "outline", "secondary", "ghost", "link"] as const) {
      button(ui, variants, life, `button-variant-${variant}`, { label: variant, variant, onClick() { clicks++; lastCallback = `variant: ${variant}`; render(); } });
    }
    const sizes = row(body);
    for (const size of ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const) {
      const icon = size.startsWith("icon");
      const slot = example(sizes, `button-size-${size}`, size);
      life.widget(ui.mountButton(slot, { label: icon ? "+" : size, title: icon ? `添加示例（${size}）` : `${size} 大小`, size, variant: "outline", onClick() { clicks++; lastCallback = `size: ${size}`; render(); } }, { signal: life.signal }));
    }
    note(body, "徽章使用插件提供的文本和颜色，背景着色 15%。这些是静态示例。");
    const badges = row(body);
    for (const [id, props] of [
      ["neutral", { text: "中性" }],
      ["green", { text: "测试通过", color: "#22c55e" }],
      ["red", { text: "测试失败", color: "#ef4444" }],
      ["amber", { text: "有提示", color: "#f59e0b" }],
    ] as const) {
      life.widget(ui.mountBadge(example(badges, `badge-${id}`), props, { signal: life.signal }));
    }
    button(ui, body, life, "button-disabled", { label: "已禁用", disabled: true, onClick() { throw new Error("Disabled example must not run"); } });
    const actions = row(body);
    button(ui, actions, life, "button-async", { label: "开始异步示例", onClick() {
      if (pending || life.signal.aborted) return;
      lastCallback = "async callback pending";
      const promise = new Promise<void>(resolve => { pending = resolve; });
      render();
      return promise;
    } });
    const complete = button(ui, actions, life, "complete-button-async", { label: "完成异步示例", variant: "outline", disabled: true, onClick() { finish(); lastCallback = "async callback completed"; render(); } });
    function finish() { const resolve = pending; pending = undefined; resolve?.(); }
    life.own(finish);
    function render() { complete.update({ disabled: !pending }); show({ clicks, pending: !!pending, lastCallback }); }
    render();
  });

  family(ui, root, scope, "settings", "设置行", (body, life) => {
    note(body, "所有值只在本地生效。文本至少包含三个非空白字符。数字和滑块的值须为显示范围内的整数。无效编辑会在调用 onChange 前被拒绝。");
    let enabled = true; let text = "Example"; let choice = "first"; let count = 3; let amount = 50; let lastCallback = "none";
    const show = readout(body, "settings");
    const update = (key: string, apply: () => void) => { if (!life.signal.aborted) { apply(); lastCallback = `${key}.onChange`; render(); } };
    const schema = (): PluginSettingsSchema => ({ rows: [
      { key: "toggle", type: "toggle", label: "开关示例", description: "A local boolean value.", value: enabled, onChange: value => update("toggle", () => { enabled = value; }) },
      { key: "text", type: "text", label: "文本示例", description: "至少三个非空白字符。", value: text, validate: value => value.trim().length < 3 ? "Enter at least three non-space characters." : undefined, onChange: value => update("text", () => { text = value; }) },
      { key: "dropdown", type: "dropdown", label: "下拉选项示例", description: "从两个本地选项中选择一个。", value: choice, options: [{ value: "first", label: "第一个选项" }, { value: "second", label: "第二个选项" }], onChange: value => update("dropdown", () => { choice = value; }) },
      { key: "number", type: "number", label: "数字输入示例", description: "1 到 10 的整数。", value: count, min: 1, max: 10, step: 1, validate: value => Number.isInteger(value) ? undefined : "Enter a whole number.", onChange: value => update("number", () => { count = value; }) },
      { key: "slider", type: "slider", label: "滑块示例", description: "0 到 100 的整数。", value: amount, min: 0, max: 100, step: 1, validate: value => Number.isInteger(value) ? undefined : "Choose a whole number.", onChange: value => update("slider", () => { amount = value; }) },
      { key: "disabled", type: "text", label: "禁用示例", description: "这一行无法编辑。", value: "Unavailable", disabled: true, onChange() {} },
    ] });
    const settings = life.widget(ui.mountSettingsRows(example(body, "settings-rows"), schema(), { signal: life.signal }));
    function render() { settings.update(schema()); show({ enabled, text, choice, count, amount, lastCallback }); }
    render();
  });

  family(ui, root, scope, "markdown", "Markdown", (body, life) => {
    note(body, "宿主静态渲染示例，包括正文、代码、表格、公式和 Mermaid。");
    life.widget(ui.mountMarkdown(example(body, "markdown"), { text: MARKDOWN }, { signal: life.signal }));
    readout(body, "markdown")({ mode: "static", lastCallback: "none" });
  });

  family(ui, root, scope, "tree", "目录树", (body, life) => mountTreeDemo(ui, body, life));

  family(ui, root, scope, "worker-results", "后台任务结果", (body, life) => {
    note(body, "十二个静态示例，包括四种终止状态和三种展示方式。");
    for (const status of ["succeeded", "failed", "cancelled", "interrupted"] as const) {
      for (const presentation of ["collapsed", "card", "plain"] as const) {
        life.widget(ui.mountWorkerResult(example(body, `worker-${status}-${presentation}`, `${status} / ${presentation}`), {
          label: "示例后台任务", status, presentation,
          text: `**静态示例：**${status}。没有实际运行任务。`,
        }, { signal: life.signal }));
      }
    }
    readout(body, "worker-results")({ examples: 12, workersStarted: 0, lastCallback: "none" });
  });

  family(ui, root, scope, "menus", "Menus", (body, life) => mountOverlayExamples(ui, body, life, "menus"));
  family(ui, root, scope, "dialogs", "Dialogs", (body, life) => mountOverlayExamples(ui, body, life, "dialogs"));
  family(ui, root, scope, "surfaces", "Surfaces", (body, life) => {
    note(body, "打开覆盖在当前页面内容上的非模态面板。页面顶栏或浮动的侧栏控件保持可见，侧栏与全局对话框仍可用。离开页面时关闭面板。");
    note(body, "在教学或练习会话的顶栏也能打开本演示。两处都包含背景预设、文本保留、嵌套面板以及在面板上方的菜单和对话框。Esc 和焦点由宿主处理。");
    let opens = 0; let closed = 0; let lastCallback = "none";
    const show = readout(body, "surfaces");
    const render = () => show({ target: "current page", opens, closed, lastCallback });
    button(ui, body, life, "open-surface", { label: "打开面板", variant: "outline", onClick() {
      if (life.signal.aborted) return;
      opens++; lastCallback = "openSurface (current page body)"; render();
      life.widget(openPageSurfaceDemo(ui, life.signal, () => {
        if (life.signal.aborted) return;
        closed++; lastCallback = "surface.onClose"; render();
      }));
    } });
    render();
  });
  return scope.dispose;
}

function join(current: string, text: string): string { return current ? `${current}\n${text}` : text; }

const MARKDOWN = `A **host-rendered** paragraph with *emphasis*, inline \`code\`, and a short list:

- Complete static content
- Built-in renderers only

\`\`\`ts
const message: string = "Hello, gallery";
console.log(message);
\`\`\`

| Example | Value |
| --- | --- |
| Local state | Ephemeral |
| Model calls | None |

Inline math: $a^2 + b^2 = c^2$.

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

\`\`\`mermaid
flowchart LR
  A[Local input] --> B[Host widget]
  B --> C[Local callback]
\`\`\`
`;
