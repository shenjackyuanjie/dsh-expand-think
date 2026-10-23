// 纯文本变换；仅调整 ReasoningRow，不导入 React，也不执行前端代码。
export const supportedVersion = '0.2.1-rc.2';
export const targetModule = '@deepseek-ai/dsh-client-ui-chat';
export const marker = '// 本地补丁：dsh-expand-thnk/v1';
export const legacyMarker = '// 本地补丁：thinking-auto-collapse/v1';

// 同一输出阶段只同步一次，后续 token 保留读者手动开合选择。
export function syncReasoningDisclosure(previousRunning, running, setExpanded) {
  if (previousRunning.current === running) return;
  previousRunning.current = running;
  setExpanded(running);
}

const original = '\t\t\tconst { expanded, toggle } = useDisclosure();\n\t\t\tconst summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);';
const replacement = '\t\t\tconst { expanded, toggle, setExpanded } = useDisclosure();\n' +
  '\t\t\tconst previousRunning = (0, react.useRef)(false);\n' +
  '\t\t\t(0, react.useLayoutEffect)(() => {\n' +
  '\t\t\t\tsyncReasoningDisclosure(previousRunning, running, setExpanded);\n' +
  '\t\t\t}, [running, setExpanded]);\n' +
  '\t\t\tconst summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);';
const component = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow(';
const helper = '\t\t' + marker + '\n' + syncReasoningDisclosure.toString()
  .split('\n').map((line) => '\t\t' + line).join('\n') + '\n';

function requireOnce(source, text, description) {
  if (source.split(text).length !== 2) {
    throw new Error(description + ' 未唯一匹配；未覆盖目标或其他本地修改。');
  }
}

export function patchSource(source, revert = false) {
  const normalized = source.replace(legacyMarker, marker);
  if (revert) {
    if (!normalized.includes(marker)) {
      requireOnce(normalized, original, '原版开合逻辑');
      return normalized;
    }
    requireOnce(normalized, helper, '本地状态同步函数');
    requireOnce(normalized, replacement, '本地开合逻辑');
    return normalized.replace(helper, '').replace(replacement, original);
  }
  if (normalized.includes(marker)) {
    requireOnce(normalized, helper, '本地状态同步函数');
    requireOnce(normalized, replacement, '本地开合逻辑');
    return normalized;
  }
  requireOnce(normalized, original, 'ReasoningRow 开合逻辑');
  requireOnce(normalized, component, 'ReasoningRow 组件');
  return normalized.replace(component, helper + component).replace(original, replacement);
}
