import type { PluginTreeProps, PluginTreeRow, PluginUi, PluginUiContent, PluginWidgetHandle } from "learnharness-plugin-api";
import { Scope, button, element, example, note, readout } from "./dom.ts";

/** Synthetic controlled values only; the host owns row presentation and keyboard behavior. */
export function mountTreeDemo(ui: PluginUi, body: HTMLElement, life: Scope): void {
  note(body, "A small synthetic directory using the host tree. Shared item appears under both folders with independent occurrence keys. Selection is optional and never cascades from folders to children. Hiding selection preserves it; Reset clears this family's state.");
  note(body, "点击一行后，可用方向键逐行移动，按空格选中可用的复选框。草稿输入仍使用正常按键。本示例设定 36rem 的最小宽度并支持横向滚动。");
  let selectionEnabled = false;
  const selectedOccurrenceKeys = new Set<string>();
  const expanded: Record<string, boolean> = { "example-folder": true, "another-folder": true };
  let draft = "Local draft";
  let lastCallback = "none";
  const show = readout(body, "tree");
  let tree: PluginWidgetHandle<PluginTreeProps>;
  const toggle = button(ui, body, life, "toggle-tree-selection", { label: "启用选择", variant: "outline", onClick() {
    if (life.signal.aborted) return;
    selectionEnabled = !selectionEnabled;
    lastCallback = selectionEnabled ? "selection enabled" : "selection disabled";
    render();
  } });

  // One factory per family lifetime: controlled updates retain this content's
  // DOM, while disclosure unmounts it and a later mount restores the local draft.
  const draftContent: PluginUiContent = (container, signal) => {
    const content = new Scope(signal);
    if (life.signal.aborted || content.signal.aborted) { content.dispose(); return content.dispose; }
    const root = element("div");
    root.append(element("div", "草稿笔记", "ui-showcase-label font-ui text-xs"));
    const input = element("input", undefined, "font-ui text-sm");
    input.type = "text";
    input.setAttribute("aria-label", "目录草稿");
    input.value = draft;
    const change = () => {
      if (life.signal.aborted || content.signal.aborted) return;
      draft = input.value; lastCallback = "draft.onInput"; render();
    };
    input.addEventListener("input", change);
    root.append(input); container.append(root);
    content.own(() => { input.removeEventListener("input", change); root.remove(); });
    return content.dispose;
  };
  const selection = (key: string, label: string): Pick<PluginTreeRow, "selection"> => selectionEnabled ? { selection: {
    label, checked: selectedOccurrenceKeys.has(key), onChange(value) {
      if (life.signal.aborted || !selectionEnabled) return;
      if (value) selectedOccurrenceKeys.add(key); else selectedOccurrenceKeys.delete(key);
      lastCallback = `selection.onChange: ${key}`; render();
    },
  } } : {};
  const folder = (key: string, title: string, children: readonly PluginTreeRow[]): PluginTreeRow => ({
    key, content: title, cells: { kind: "Folder", state: expanded[key] ? "Expanded" : "Collapsed" }, children,
    ...selection(key, `选择 ${title}`),
    disclosure: { label: `切换 ${title}`, expanded: expanded[key]!, onChange(value) {
      if (life.signal.aborted) return;
      expanded[key] = value; lastCallback = `disclosure.onChange: ${key}`; render();
    } },
  });
  const rows = (): PluginTreeRow[] => [
    folder("example-folder", "示例文件夹", [
      { key: "example-folder/shared-item", content: "Shared item", cells: { kind: "Note", state: "Repeated" }, ...selection("example-folder/shared-item", "选择示例文件夹中的共享项目") },
      { key: "example-folder/draft-note", content: draftContent, cells: { kind: "Draft", state: "Editable" }, ...selection("example-folder/draft-note", "选择草稿笔记") },
    ]),
    folder("another-folder", "另一个文件夹", [
      { key: "another-folder/shared-item", content: "Shared item", cells: { kind: "Note", state: "Repeated" }, ...selection("another-folder/shared-item", "选择另一个文件夹中的共享项目") },
    ]),
  ];
  const viewport = example(body, "tree");
  viewport.style.overflowX = "auto";
  const minimum = element("div"); minimum.style.minWidth = "36rem";
  viewport.append(minimum);
  tree = life.widget(ui.mountTree(minimum, {
    label: "目录示例", header: "Name", rows: rows(), columns: [
      { key: "kind", header: "Kind", width: 56 },
      { key: "state", header: "State", width: 80 },
    ],
  }, { signal: life.signal }));
  function render() {
    tree.update({ rows: rows() });
    toggle.update({ label: selectionEnabled ? "禁用选择" : "启用选择" });
    show({ selectionEnabled, selectedOccurrenceKeys: [...selectedOccurrenceKeys], expanded: { ...expanded }, draft, lastCallback });
  }
  render();
}
