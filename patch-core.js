// 纯文本变换；仅调整 ReasoningRow，不导入 React，也不执行前端代码。
// 0.2.1-rc.2 至 0.2.2-rc.1 为带缩进的可读构建，共用同一组锚点。
// 0.2.2-rc.2 起客户端产物改为压缩构建，锚点单独维护，注入逻辑共用；rc.3 的产物与 rc.2 逐字节相同。
// 正文归一化在创建开合状态之后，锚点仅取创建语句，不依赖 text 的声明位置。
export const supportedVersions = [
  '0.2.1-rc.2',
  '0.2.1-rc.3',
  '0.2.1-rc.4',
  '0.2.1-rc.5',
  '0.2.2-rc.1',
  '0.2.2-rc.2',
  '0.2.2-rc.3',
];
export const supportedVersion = supportedVersions[supportedVersions.length - 1];
export const targetModule = '@deepseek-ai/dsh-client-ui-chat';
export const marker = '// 本地补丁：dsh-expand-think/v1';
export const bridgeKey = Symbol.for('dsh-expand-think/runtime');
/** 自动展开时限高的默认行数与允许范围，Host 与 Client 共用。 */
export const DEFAULT_MAX_LINES = 9;
export const MIN_MAX_LINES = 3;
export const MAX_MAX_LINES = 60;
/** 收起动画时长（毫秒），补丁与 CSS 共用同一个值。 */
export const COLLAPSE_ANIMATION_MS = 240;

export function normalizeOptions(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('设置必须是对象。');
  }
  for (const key of Object.keys(options)) {
    if (
      !['autoExpand', 'autoCollapse', 'limitHeight', 'maxLines', 'collapseAnimation'].includes(key)
    ) {
      throw new Error('未知设置：' + key);
    }
    if (key === 'maxLines') continue;
    if (options[key] !== undefined && typeof options[key] !== 'boolean') {
      throw new Error(key + ' 必须是布尔值。');
    }
  }
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  if (!Number.isInteger(maxLines) || maxLines < MIN_MAX_LINES || maxLines > MAX_MAX_LINES) {
    throw new Error('maxLines 必须是 ' + MIN_MAX_LINES + '–' + MAX_MAX_LINES + ' 的整数。');
  }
  return {
    autoExpand: options.autoExpand ?? true,
    autoCollapse: options.autoCollapse ?? true,
    limitHeight: options.limitHeight ?? true,
    maxLines,
    collapseAnimation: options.collapseAnimation ?? true,
  };
}

// 读取插件 Client 半边提供的已接受配置；桥接尚未就绪时不执行自动开合。
export function readExpandThnkOptions() {
  try {
    const bridge = globalThis[Symbol.for('dsh-expand-think/runtime')];
    const value = bridge?.getOptions?.();
    if (typeof value?.autoExpand === 'boolean' && typeof value?.autoCollapse === 'boolean') {
      return value;
    }
  } catch {
    /* 配置不可用时不影响原生 Chat。 */
  }
  return { autoExpand: false, autoCollapse: false };
}

// 同一输出阶段只同步一次，后续 token 保留读者手动开合选择。
// 返回值表示本次切换确实由自动逻辑执行，用于区分自动展开与手动展开。
export function syncReasoningDisclosure(
  previousRunning,
  running,
  setExpanded,
  options = { autoExpand: true, autoCollapse: true },
) {
  if (previousRunning.current === running) return false;
  previousRunning.current = running;
  const applied = running ? options.autoExpand : options.autoCollapse;
  if (applied) setExpanded(running);
  return applied;
}

const component = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow(';
const minifiedComponent = 'const ReasoningRow=(0,react.memo)(function ReasoningRow(';
const indented = (text) =>
  text
    .split('\n')
    .map((line) => '\t\t' + line)
    .join('\n') + '\n';
const helper =
  '\t\t' +
  marker +
  '\n' +
  indented(readExpandThnkOptions.toString()) +
  indented(syncReasoningDisclosure.toString());

const disclosureOriginal = '\t\t\tconst { expanded, toggle } = useDisclosure();\n';
const minifiedDisclosureOriginal = 'const{expanded,toggle}=useDisclosure();';
const disclosureHead = '\t\t\tconst { expanded, toggle, setExpanded } = useDisclosure();\n';

/** 两代客户端构建形态；补丁主体共用，只有原始锚点不同。 */
const layouts = {
  readable: { component, disclosure: disclosureOriginal },
  minified: { component: minifiedComponent, disclosure: minifiedDisclosureOriginal },
};

/** 0.3.4 及更早：只有自动开合。 */
const legacyDisclosure =
  disclosureHead +
  '\t\t\tconst previousRunning = (0, react.useRef)(false);\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tsyncReasoningDisclosure(previousRunning, running, setExpanded, readExpandThnkOptions());\n' +
  '\t\t\t}, [running, setExpanded]);\n';

/** 0.3.5：自动开合 + 自动展开限高标记。 */
const heightOnlyDisclosure =
  disclosureHead +
  '\t\t\tconst previousRunning = (0, react.useRef)(false);\n' +
  '\t\t\tconst [autoClamped, setAutoClamped] = (0, react.useState)(false);\n' +
  '\t\t\tconst toggleUnclamped = () => {\n' +
  '\t\t\t\tsetAutoClamped(false);\n' +
  '\t\t\t\ttoggle();\n' +
  '\t\t\t};\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tconst applied = syncReasoningDisclosure(previousRunning, running, setExpanded, readExpandThnkOptions());\n' +
  '\t\t\t\tif (applied) setAutoClamped(running);\n' +
  '\t\t\t}, [running, setExpanded]);\n';

/**
 * 0.3.6：自动开合 + 限高 + 跟随滚动 + 收起动画。
 * 滚动跟随用 rAF 循环而不是 text 依赖：rc.5 的 text 在本段之后才定义。
 */
const currentDisclosure =
  disclosureHead +
  '\t\t\tconst previousRunning = (0, react.useRef)(false);\n' +
  '\t\t\tconst [autoClamped, setAutoClamped] = (0, react.useState)(false);\n' +
  '\t\t\tconst [autoClosing, setAutoClosing] = (0, react.useState)(false);\n' +
  '\t\t\tconst rootRef = (0, react.useRef)(null);\n' +
  '\t\t\tconst lastBodyHeight = (0, react.useRef)(0);\n' +
  '\t\t\tconst closeTimer = (0, react.useRef)(null);\n' +
  '\t\t\tconst expandedRef = (0, react.useRef)(false);\n' +
  '\t\t\texpandedRef.current = expanded;\n' +
  '\t\t\tfunction setExpandedAnimated(value) {\n' +
  '\t\t\t\tconst options = readExpandThnkOptions();\n' +
  '\t\t\t\tconst body = rootRef.current?.querySelector?.(".dsh-et-body");\n' +
  '\t\t\t\tif (value === false && expandedRef.current && body && options.collapseAnimation !== false) {\n' +
  '\t\t\t\t\tdocument.documentElement.style.setProperty("--dsh-et-open-height", body.clientHeight + "px");\n' +
  '\t\t\t\t\tsetAutoClosing(true);\n' +
  '\t\t\t\t\tclearTimeout(closeTimer.current);\n' +
  '\t\t\t\t\tcloseTimer.current = setTimeout(() => {\n' +
  '\t\t\t\t\t\tsetAutoClosing(false);\n' +
  '\t\t\t\t\t\tsetAutoClamped(false);\n' +
  '\t\t\t\t\t\tsetExpanded(false);\n' +
  `\t\t\t\t\t}, ${COLLAPSE_ANIMATION_MS});\n` +
  '\t\t\t\t\treturn;\n' +
  '\t\t\t\t}\n' +
  '\t\t\t\tclearTimeout(closeTimer.current);\n' +
  '\t\t\t\tsetAutoClosing(false);\n' +
  '\t\t\t\tsetExpanded(value);\n' +
  '\t\t\t}\n' +
  '\t\t\tconst toggleUnclamped = () => {\n' +
  '\t\t\t\tif (expanded) setExpandedAnimated(false);\n' +
  '\t\t\t\telse {\n' +
  '\t\t\t\t\tsetAutoClamped(false);\n' +
  '\t\t\t\t\tsetExpanded(true);\n' +
  '\t\t\t\t}\n' +
  '\t\t\t};\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tconst applied = syncReasoningDisclosure(previousRunning, running, setExpandedAnimated, readExpandThnkOptions());\n' +
  '\t\t\t\tif (applied && running) setAutoClamped(true);\n' +
  '\t\t\t}, [running]);\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tif (!autoClamped || !running) return;\n' +
  '\t\t\t\tlet frame = 0;\n' +
  '\t\t\t\tconst follow = () => {\n' +
  '\t\t\t\t\tconst body = rootRef.current?.querySelector?.(".dsh-et-body");\n' +
  '\t\t\t\t\tif (body) {\n' +
  '\t\t\t\t\t\tconst atBottom = lastBodyHeight.current - body.scrollTop - body.clientHeight < 24;\n' +
  '\t\t\t\t\t\tif (atBottom) body.scrollTop = body.scrollHeight;\n' +
  '\t\t\t\t\t\tlastBodyHeight.current = body.scrollHeight;\n' +
  '\t\t\t\t\t}\n' +
  '\t\t\t\t\tframe = requestAnimationFrame(follow);\n' +
  '\t\t\t\t};\n' +
  '\t\t\t\tframe = requestAnimationFrame(follow);\n' +
  '\t\t\t\treturn () => cancelAnimationFrame(frame);\n' +
  '\t\t\t}, [autoClamped, running]);\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => () => clearTimeout(closeTimer.current), []);\n';

const disclosureLayouts = [currentDisclosure, heightOnlyDisclosure, legacyDisclosure];

/**
 * 补丁标记与正文容器改动。前三条是原始文件里的唯一锚点，
 * 最后一条接在「限高标记」之后，属于链式改动：原始文件里不存在它的输入。
 */
const edits = [
  {
    // 手动点击展开时不继承自动展开的限高，也不触发收起动画的重复分支。
    name: '手动开合不受限高影响',
    original: '\n\t\t\t\t\tonToggle: toggle,\n',
    patched: '\n\t\t\t\t\tonToggle: toggleUnclamped,\n',
  },
  {
    // 稳定类名供插件 CSS 命中，不依赖构建产物的 hash 前缀。
    name: '展开正文容器标记',
    original: '\t\t\t\tclassName: ReasoningRow_module_css_default.thinkBody,\n',
    patched: '\t\t\t\tclassName: ReasoningRow_module_css_default.thinkBody + " dsh-et-body",\n',
  },
  {
    name: '自动展开限高标记',
    original: '\t\t\t\t"data-preview": preview || void 0,\n',
    patched:
      '\t\t\t\t"data-preview": preview || void 0,\n' +
      '\t\t\t\t"data-dsh-et-clamped": autoClamped || void 0,\n',
  },
  {
    name: '收起动画标记与根引用',
    chained: true,
    original: '\t\t\t\t"data-dsh-et-clamped": autoClamped || void 0,\n',
    patched:
      '\t\t\t\t"data-dsh-et-clamped": autoClamped || void 0,\n' +
      '\t\t\t\t"data-dsh-et-closing": autoClosing || void 0,\n' +
      '\t\t\t\tref: rootRef,\n',
  },
];

/** 压缩构建的同一组改动；只差空白与分号，语义与可读构建一致。 */
const minifiedEdits = [
  {
    name: '手动开合不受限高影响',
    original: 'expandOnRowClick:true,onToggle:toggle,collapsedContent',
    patched: 'expandOnRowClick:true,onToggle:toggleUnclamped,collapsedContent',
  },
  {
    name: '展开正文容器标记',
    original: 'className:ReasoningRow_module_css_default.thinkBody',
    patched: 'className:ReasoningRow_module_css_default.thinkBody+" dsh-et-body"',
  },
  {
    name: '自动展开限高标记',
    original: '"data-preview":preview||void 0',
    patched: '"data-preview":preview||void 0,"data-dsh-et-clamped":autoClamped||void 0',
  },
  {
    name: '收起动画标记与根引用',
    chained: true,
    original: '"data-dsh-et-clamped":autoClamped||void 0',
    patched:
      '"data-dsh-et-clamped":autoClamped||void 0,' +
      '"data-dsh-et-closing":autoClosing||void 0,ref:rootRef',
  },
];

function requireOnce(source, text, description) {
  if (source.split(text).length !== 2) {
    throw new Error(description + ' 未唯一匹配；未覆盖目标或其他本地修改。');
  }
}

function stripHelper(source, layout) {
  const helperStart = source.indexOf('\t\t' + marker);
  const componentAt = source.indexOf(layout.component, helperStart);
  if (helperStart < 0 || componentAt < 0) {
    throw new Error('本地状态读取与同步函数 后缺少 ReasoningRow 组件；未覆盖。');
  }
  const segment = source.slice(helperStart, componentAt);
  if (
    !segment.includes('function readExpandThnkOptions(') ||
    !segment.includes('function syncReasoningDisclosure(')
  ) {
    throw new Error('本地状态读取与同步函数 结构已被修改；未覆盖。');
  }
  return source.slice(0, helperStart) + source.slice(componentAt);
}

// 只接受已知的历史形态，被其他代码改过的段落一律拒绝覆盖。
function restoreDisclosure(source, target) {
  const head = source.indexOf(disclosureHead);
  if (head < 0) throw new Error('ReasoningRow 开合逻辑 缺少起始标记；未覆盖。');
  for (const body of disclosureLayouts) {
    if (source.startsWith(body, head)) {
      return source.slice(0, head) + target.disclosure + source.slice(head + body.length);
    }
  }
  throw new Error('ReasoningRow 开合逻辑 已被修改；未覆盖。');
}

function restoreEdits(source) {
  let clean = source;
  for (const edit of [...edits, ...minifiedEdits].reverse()) {
    if (!clean.includes(edit.patched)) continue;
    requireOnce(clean, edit.patched, edit.name);
    clean = clean.replace(edit.patched, edit.original);
  }
  return clean;
}

/** 识别目标产物的构建形态；两种形态的组件锚点各自唯一。 */
export function layoutOf(source) {
  const matched = Object.keys(layouts).filter((id) => source.includes(layouts[id].component));
  if (matched.length !== 1) {
    throw new Error('ReasoningRow 组件 未唯一匹配；未覆盖目标或其他本地修改。');
  }
  return matched[0];
}

export function patchSource(source, revert = false) {
  const layoutId = layoutOf(source);
  const layout = layouts[layoutId];
  const active = layoutId === 'minified' ? minifiedEdits : edits;
  let clean = source;
  if (clean.includes(marker)) {
    clean = restoreEdits(restoreDisclosure(stripHelper(clean, layout), layout));
  }
  requireOnce(clean, layout.component, 'ReasoningRow 组件');
  requireOnce(clean, layout.disclosure, 'ReasoningRow 开合逻辑');
  for (const edit of active) {
    if (!edit.chained) requireOnce(clean, edit.original, edit.name);
  }
  if (revert) return clean;
  let patched = clean.replace(layout.component, helper + layout.component);
  patched = patched.replace(layout.disclosure, currentDisclosure);
  for (const edit of active) patched = patched.replace(edit.original, edit.patched);
  return patched;
}
