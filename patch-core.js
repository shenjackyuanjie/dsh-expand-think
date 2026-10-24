// 纯文本变换；仅调整 ReasoningRow，不导入 React，也不执行前端代码。
export const supportedVersion = '0.2.1-rc.2';
export const targetModule = '@deepseek-ai/dsh-client-ui-chat';
export const marker = '// 本地补丁：dsh-expand-think/v1';
export const bridgeKey = Symbol.for('dsh-expand-think/runtime');

export function normalizeOptions(options = {}) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('设置必须是对象。');
  }
  for (const key of Object.keys(options)) {
    if (!['autoExpand', 'autoCollapse'].includes(key)) throw new Error('未知设置：' + key);
    if (options[key] !== undefined && typeof options[key] !== 'boolean') {
      throw new Error(key + ' 必须是布尔值。');
    }
  }
  return { autoExpand: options.autoExpand ?? true, autoCollapse: options.autoCollapse ?? true };
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
export function syncReasoningDisclosure(
  previousRunning,
  running,
  setExpanded,
  options = { autoExpand: true, autoCollapse: true },
) {
  if (previousRunning.current === running) return;
  previousRunning.current = running;
  if (running ? options.autoExpand : options.autoCollapse) setExpanded(running);
}

const original =
  '\t\t\tconst { expanded, toggle } = useDisclosure();\n' +
  '\t\t\tconst summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);';
const replacement =
  '\t\t\tconst { expanded, toggle, setExpanded } = useDisclosure();\n' +
  '\t\t\tconst previousRunning = (0, react.useRef)(false);\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tsyncReasoningDisclosure(previousRunning, running, setExpanded, readExpandThnkOptions());\n' +
  '\t\t\t}, [running, setExpanded]);\n' +
  '\t\t\tconst summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);';
const component = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow(';
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

function requireOnce(source, text, description) {
  if (source.split(text).length !== 2) {
    throw new Error(description + ' 未唯一匹配；未覆盖目标或其他本地修改。');
  }
}

export function patchSource(source, revert = false) {
  let clean = source;
  if (clean.includes(marker)) {
    requireOnce(clean, helper, '本地状态读取与同步函数');
    requireOnce(clean, replacement, '本地开合逻辑');
    clean = clean.replace(helper, '').replace(replacement, original);
  }
  requireOnce(clean, original, 'ReasoningRow 开合逻辑');
  requireOnce(clean, component, 'ReasoningRow 组件');
  if (revert) return clean;
  return clean.replace(component, helper + component).replace(original, replacement);
}
