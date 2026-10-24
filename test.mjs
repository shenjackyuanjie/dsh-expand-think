// 离线回归：只测试纯状态策略、文本变换和文件生命周期，不模拟 React 或 DOM。
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { apply, Config, inject } from './index.js';
import { readSettings } from './settings.js';
import { legacyMarker, marker, normalizeOptions, patchSource, readExpandThnkOptions, supportedVersion, syncReasoningDisclosure, targetModule, v2Marker } from './patch-core.js';

const fixture = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow({ text, running, useDisclosure }) {\n' +
  '\t\t\tconst { expanded, toggle } = useDisclosure();\n' +
  '\t\t\tconst summaryText = running ? latestCompletedParagraphFirstLine(text) : firstLine(text);\n' +
  '\t\t\treturn expanded;\n\t\t});\n';
// 可传入实际 DSH 前端产物路径，复核已安装版本中的精确锚点。
const original = patchSource(process.argv[2] ? readFileSync(process.argv[2], 'utf8') : fixture, true);
const patched = patchSource(original);
function legacySource() {
  const head = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow(';
  const helper = '\t\t' + legacyMarker + '\n\t\tfunction syncReasoningDisclosure(previousRunning, running, setExpanded) {\n' +
    '\t\t  if (previousRunning.current === running) return;\n\t\t  previousRunning.current = running;\n\t\t  setExpanded(running);\n\t\t}\n';
  const before = '\t\t\tconst { expanded, toggle } = useDisclosure();\n';
  const after = '\t\t\tconst { expanded, toggle, setExpanded } = useDisclosure();\n' +
    '\t\t\tconst previousRunning = (0, react.useRef)(false);\n\t\t\t(0, react.useLayoutEffect)(() => {\n' +
    '\t\t\t\tsyncReasoningDisclosure(previousRunning, running, setExpanded);\n\t\t\t}, [running, setExpanded]);\n';
  return original.replace(head, helper + head).replace(before, after);
}
const start = patched.indexOf('function syncReasoningDisclosure(');
const end = patched.indexOf('\n\t\tconst ReasoningRow =', start);
const sync = vm.runInNewContext('(' + patched.slice(start, end).trim() + ')');

function disclosure(running = false, options = {}) {
  const previous = { current: false };
  let expanded = false;
  const calls = [];
  const setExpanded = (value) => { expanded = value; calls.push(value); };
  const update = (value, setter = setExpanded) => sync(previous, value, setter, normalizeOptions(options));
  update(running);
  return { update, calls, setExpanded, get expanded() { return expanded; } };
}

async function lifecycle(run, source = original, version = supportedVersion, options = {}) {
  const directory = mkdtempSync(resolve(tmpdir(), 'dsh-expand-thnk-test-'));
  const library = resolve(directory, 'lib');
  mkdirSync(library);
  const target = resolve(library, 'client.js');
  writeFileSync(resolve(directory, 'package.json'), JSON.stringify({ name: targetModule, version }));
  writeFileSync(target, source);
  const listeners = new Set();
  const cleanup = [];
  const warnings = [];
  let revisions = 0;
  let available = true;
  let settingsRevision = 0;
  let current = normalizeOptions(options);
  const config = { autoExpand: { get: () => current.autoExpand }, autoCollapse: { get: () => current.autoCollapse } };
  const settingsListeners = new Set();
  const settings = {
    configure: () => () => {},
    describe: () => [{ ns: 'dsh-expand-thnk', value: { ...current }, revision: settingsRevision }],
    async mutate(namespace, ops, expected) {
      assert.equal(namespace, 'dsh-expand-thnk');
      if (expected !== settingsRevision) throw new Error('设置版本冲突');
      current = normalizeOptions({ ...current, ...Object.fromEntries(ops.map((op) => [op.path[0], op.value])) });
      settingsRevision++;
      for (const listener of settingsListeners) listener(namespace, settingsRevision);
    },
  };
  const ctx = {
    settings,
    on(event, listener) { assert.equal(event, 'settings/document-updated'); settingsListeners.add(listener); return () => settingsListeners.delete(listener); },
    clientModules: {
      clientPath(id) { assert.equal(id, targetModule); return available ? target : undefined; },
      onGraphChanged(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      rebuilt(id) { assert.equal(id, targetModule); revisions++; for (const listener of listeners) listener(); return String(revisions); },
    },
    effect(setup) { cleanup.push(setup()); },
    logger: { warn(message) { warnings.push(message); } },
  };
  const state = {
    target, ctx, warnings, listeners,
    read: () => readFileSync(target, 'utf8'),
    write: (text) => writeFileSync(target, text),
    mount: () => apply(ctx, config),
    configure: async (values) => {
      await settings.mutate('dsh-expand-thnk', Object.entries(values).map(([field, value]) => ({ op: 'set', path: [field], value })), settingsRevision);
      return { ...current, revision: settingsRevision };
    },
    settings, config, settingsListeners,
    unmount: () => { for (const dispose of cleanup.splice(0).reverse()) dispose(); },
    graph: () => { for (const listener of listeners) listener(); },
    available: (value) => { available = value; },
    get revisions() { return revisions; },
  };
  try { await run(state); }
  finally { state.unmount(); rmSync(directory, { recursive: true, force: true }); }
}

test('历史 thinking 默认折叠', () => {
  const state = disclosure();
  assert.equal(state.expanded, false); assert.deepEqual(state.calls, []);
});
test('挂载时已在输出 thinking，也自动展开', () => {
  const state = disclosure(true);
  assert.equal(state.expanded, true); assert.deepEqual(state.calls, [true]);
});
test('开始输出展开，连续 token 不重复设置状态', () => {
  const state = disclosure(); state.update(true);
  for (let index = 0; index < 100; index++) state.update(true);
  assert.deepEqual(state.calls, [true]);
});
test('thinking 结束立即收起，无需等待整轮完成', () => {
  const state = disclosure(true); state.update(false);
  assert.equal(state.expanded, false); assert.deepEqual(state.calls, [true, false]);
});
test('中断或失败结束流式状态时同样收起', () => {
  const state = disclosure(true); state.update(false); state.update(false);
  assert.deepEqual(state.calls, [true, false]);
});
test('输出中手动收起，后续 token 保留手动选择', () => {
  const state = disclosure(true); state.setExpanded(false); state.update(true);
  assert.equal(state.expanded, false); assert.deepEqual(state.calls, [true, false]);
});
test('结束后手动展开，后续渲染不会再次收起', () => {
  const state = disclosure(true); state.update(false); state.setExpanded(true); state.update(false);
  assert.equal(state.expanded, true);
});
test('历史思考手动展开可保留', () => {
  const state = disclosure(); state.setExpanded(true); state.update(false);
  assert.equal(state.expanded, true);
});
test('重试或下一段思考重新自动开合', () => {
  const state = disclosure(true); state.update(false); state.update(true); state.update(false);
  assert.deepEqual(state.calls, [true, false, true, false]);
});
test('多个区块的开合互不影响', () => {
  const first = disclosure(true), second = disclosure(true); first.update(false);
  assert.equal(first.expanded, false); assert.equal(second.expanded, true);
});
test('setter 或外层重置来源变化，不重开同一阶段', () => {
  const state = disclosure(true); let count = 0;
  state.update(true, () => { count++; }); assert.equal(count, 0);
});
test('测试使用的函数就是实际注入产物的函数', () => {
  assert.equal(sync.toString(), syncReasoningDisclosure.toString().split('\n')
    .map((line, index) => index === 0 ? line : '\t\t' + line).join('\n'));
});
test('补丁可重复应用、精确撤销', () => {
  assert.equal(patchSource(patched), patched);
  assert.equal(patchSource(patched, true), original);
  assert.equal(patchSource(original, true), original);
  assert.equal(patched.split(marker).length - 1, 1);
});
test('接管前一版手动补丁，不叠加开合逻辑', () => {
  const legacy = legacySource();
  assert.equal(patchSource(legacy), patched);
  assert.equal(patchSource(legacy, true), original);
});
test('补丁之外的本地改动原样保留', () => {
  const custom = original + '\n// 其他本地修改\n';
  assert.equal(patchSource(patchSource(custom), true), custom);
});
test('未知、重复、残缺锚点拒绝覆盖', () => {
  assert.throws(() => patchSource('其他代码'), /未唯一匹配/);
  assert.throws(() => patchSource(original + original), /未唯一匹配/);
  assert.throws(() => patchSource(patched.replace('previousRunning, running, setExpanded', 'changed')), /未唯一匹配/);
});
test('组件使用布局阶段同步，沿用原有手动开合状态', () => {
  assert.ok(patched.includes('const { expanded, toggle, setExpanded } = useDisclosure();'));
  assert.ok(patched.includes('(0, react.useLayoutEffect)(() => {\n\t\t\t\tsyncReasoningDisclosure(previousRunning, running, setExpanded, readExpandThnkOptions());\n\t\t\t}, [running, setExpanded]);'));
});
test('插件启用时应用，停用时还原，并通知前端热更新', () => lifecycle((state) => {
  state.mount(); assert.equal(state.read(), patched); assert.equal(state.revisions, 1);
  state.unmount(); assert.equal(state.read(), original); assert.equal(state.revisions, 2);
  assert.equal(state.listeners.size, 0); assert.deepEqual(state.warnings, []);
}));
test('同步 graph 回调不会递归写入或重复热更新', () => lifecycle((state) => {
  state.mount(); state.graph(); state.graph();
  assert.equal(state.revisions, 1); assert.equal(state.read(), patched);
}));
test('已有手动补丁也纳入插件停用还原流程', () => lifecycle((state) => {
  state.mount(); assert.equal(state.read(), patched);
  state.unmount(); assert.equal(state.read(), original);
}, legacySource()));
test('目标稍后加入 graph 时自动应用，不使用轮询', () => lifecycle((state) => {
  state.available(false); state.mount(); assert.equal(state.revisions, 0);
  state.available(true); state.graph(); assert.equal(state.read(), patched);
  state.unmount(); assert.equal(state.listeners.size, 0);
}));
test('不支持的版本激活失败，保留原文件并清理订阅', () => lifecycle((state) => {
  assert.throws(() => state.mount(), /仅支持/);
  assert.equal(state.read(), original); assert.equal(state.listeners.size, 0);
}, original, '0.2.2'));
test('目标结构不匹配时不修改文件', () => lifecycle((state) => {
  assert.throws(() => state.mount(), /未唯一匹配/);
  assert.equal(state.read(), 'const unrelated = true;'); assert.equal(state.listeners.size, 0);
}, 'const unrelated = true;'));
test('停用保留补丁之外的后续本地改动', () => lifecycle((state) => {
  state.mount(); state.write(state.read() + '\n// 后续修改\n'); state.unmount();
  assert.equal(state.read(), original + '\n// 后续修改\n');
}));
test('补丁内部被他人改过时停用不覆盖，并给出诊断', () => lifecycle((state) => {
  state.mount(); const changed = state.read().replace('previousRunning, running, setExpanded', 'otherCode');
  state.write(changed); state.unmount(); assert.equal(state.read(), changed); assert.equal(state.warnings.length, 1);
}));
test('后续 graph 更新结构不匹配时记录诊断，不覆盖其他文件', () => lifecycle((state) => {
  state.mount(); state.write('const changedByOther = true;'); state.graph();
  assert.equal(state.read(), 'const changedByOther = true;'); assert.equal(state.warnings.length, 1);
}));

for (const autoExpand of [false, true]) for (const autoCollapse of [false, true]) {
  const options = { autoExpand, autoCollapse };
  test('独立开关组合：' + JSON.stringify(options), () => {
    const state = disclosure(false, options); state.update(true); state.update(false);
    assert.deepEqual(state.calls, [...(autoExpand ? [true] : []), ...(autoCollapse ? [false] : [])]);
    assert.ok(!patched.includes('const EXPAND_THNK_OPTIONS = '));
    assert.equal(patchSource(patched), patched);
    assert.equal(patchSource(patched, true), original);
  });
}
test('关闭结束收起时保留输出结束前的手动状态', () => {
  const state = disclosure(true, { autoCollapse: false }); state.setExpanded(false); state.update(false);
  assert.equal(state.expanded, false); assert.deepEqual(state.calls, [true, false]);
});
test('关闭自动展开时，手动展开的正文仍按收起开关执行', () => {
  const state = disclosure(true, { autoExpand: false }); state.setExpanded(true); state.update(false);
  assert.equal(state.expanded, false); assert.deepEqual(state.calls, [true, false]);
});
test('Config 默认均开启，两个布尔值均为真正的 volatile 字段', () => {
  assert.deepEqual(readSettings(Config({})), { autoExpand: true, autoCollapse: true });
  assert.deepEqual(readSettings(Config({ autoExpand: false, autoCollapse: true })), { autoExpand: false, autoCollapse: true });
  assert.throws(() => Config({ autoExpand: 'false' }));
  assert.throws(() => Config({ autoCollapse: 0 }));
});
test('未知字段、空值和错误类型不被当成有效配置', () => {
  assert.throws(() => normalizeOptions({ unknown: true }), /未知设置/);
  assert.throws(() => normalizeOptions({ autoExpand: 'false' }), /布尔值/);
  assert.throws(() => normalizeOptions(null), /对象/);
});
test('连续保存只更新配置，不改写 Chat 文件或触发额外 HMR', () => lifecycle(async (state) => {
  state.mount(); const before = state.read();
  const result = await state.configure({ autoExpand: false });
  assert.deepEqual(result, { autoExpand: false, autoCollapse: true, revision: 1 });
  assert.equal(state.read(), before); assert.equal(state.revisions, 1);
  await state.configure({ autoCollapse: false }); state.graph();
  assert.equal(state.read(), before); assert.equal(state.revisions, 1);
  await state.configure({ autoExpand: true, autoCollapse: true });
  assert.equal(state.read(), before); assert.equal(state.revisions, 1);
  assert.equal(state.settingsListeners.size, 0);
  state.unmount(); assert.equal(state.read(), original);
  assert.equal(state.settingsListeners.size, 0);
}));
test('原生设置保留 revision 检查，旧版本写入被拒绝', () => lifecycle(async (state) => {
  state.mount(); const initial = state.settings.describe()[0];
  await state.configure({ autoExpand: false });
  await assert.rejects(state.settings.mutate(initial.ns, [{ op: 'set', path: ['autoCollapse'], value: false }], initial.revision), /冲突/);
  assert.deepEqual(state.settings.describe()[0].value, { autoExpand: false, autoCollapse: true });
  assert.equal(state.settings.describe()[0].revision, 1);
}));
test('插件不依赖或注册专用配置 Tool', () => {
  assert.deepEqual(inject, ['clientModules', 'settings']);
  assert.ok(!readFileSync(new URL('./index.js', import.meta.url), 'utf8').includes('ctx.tools'));
  assert.ok(!readFileSync(new URL('./settings.js', import.meta.url), 'utf8').includes('expand_thnk_settings'));
});

const client = readFileSync(new URL('./client.js', import.meta.url), 'utf8');
const pureFormSource = client.slice(client.indexOf('function createDraft('), client.indexOf('function SettingsPage('));
const form = vm.runInNewContext(pureFormSource + '\n' + readExpandThnkOptions.toString() + '\n({createDraft, operations, installRuntimeBridge, readExpandThnkOptions})');
test('表单连续编辑保持最初 revision，未触碰字段不丢失', () => {
  const first = form.createDraft({ value: { autoExpand: true, autoCollapse: true }, revision: 4 }, 'autoExpand', false, null);
  const second = form.createDraft({ value: { autoExpand: true, autoCollapse: true }, revision: 5 }, 'autoCollapse', false, first);
  assert.equal(second.revision, 4);
  assert.equal(JSON.stringify(second.values), JSON.stringify({ autoExpand: false, autoCollapse: false }));
});
test('表单保存两个字段为同一次原子操作，false 不被遗漏', () => {
  const ops = form.operations({ autoExpand: false, autoCollapse: true });
  assert.equal(JSON.stringify(ops), JSON.stringify([{ op: 'set', path: ['autoExpand'], value: false }, { op: 'set', path: ['autoCollapse'], value: true }]));
  assert.throws(() => form.operations({ autoExpand: 'false', autoCollapse: true }), /布尔值/);
});
test('详情页注册正确插槽，保留保存失败、只读、可访问开关行为', () => {
  assert.ok(client.includes("name: 'plugins.bundle.config', key: namespace"));
  assert.ok(client.includes('form.mutate(ops, revision)'));
  assert.ok(client.includes("role: 'switch', 'aria-checked': values[field]"));
  assert.ok(client.includes("role: 'alert'"));
  assert.ok(client.includes('!snapshot.writable'));
  assert.ok(!client.includes("require('@deepseek-ai/"));
  assert.ok(!client.includes('document.body'));
  assert.ok(!client.includes('.rebuilt('));
  assert.ok(!client.includes('.whileServed('));
});
test('读取已接受的浏览器配置，不重载、不复制 profile 状态', () => {
  let snapshot = { status: 'loading', value: undefined };
  const dispose = form.installRuntimeBridge({ getSnapshot: () => snapshot });
  try {
    assert.equal(JSON.stringify(form.readExpandThnkOptions()), JSON.stringify({ autoExpand: false, autoCollapse: false }));
    snapshot = { status: 'ready', value: { autoExpand: true, autoCollapse: false } };
    assert.equal(JSON.stringify(form.readExpandThnkOptions()), JSON.stringify(snapshot.value));
    snapshot = { status: 'ready', value: { autoExpand: false, autoCollapse: true } };
    assert.equal(JSON.stringify(form.readExpandThnkOptions()), JSON.stringify(snapshot.value));
  } finally { dispose(); }
  assert.equal(JSON.stringify(form.readExpandThnkOptions()), JSON.stringify({ autoExpand: false, autoCollapse: false }));
});
test('状态桥接读取失败不影响原生 Chat，旧实例清理不删除新实例', () => {
  const old = form.installRuntimeBridge({ getSnapshot: () => ({ status: 'ready', value: { autoExpand: true, autoCollapse: true } }) });
  const latest = form.installRuntimeBridge({ getSnapshot() { throw new Error('连接已结束'); } });
  try {
    old();
    assert.equal(JSON.stringify(form.readExpandThnkOptions()), JSON.stringify({ autoExpand: false, autoCollapse: false }));
  } finally { latest(); old(); }
});
test('旧版带静态开关的 v2 补丁可以精确迁移和还原', () => {
  const oldHelper = '\t\t' + v2Marker + '\n\t\tconst EXPAND_THNK_OPTIONS = {"autoExpand":false,"autoCollapse":true};\n' +
    syncReasoningDisclosure.toString().split('\n').map((line) => '\t\t' + line).join('\n') + '\n';
  const head = '\t\tconst ReasoningRow = (0, react.memo)(function ReasoningRow(';
  const oldFunction = legacySource();
  const first = oldFunction.indexOf('\t\t' + legacyMarker);
  const last = oldFunction.indexOf(head, first);
  const oldSource = oldFunction.slice(0, first) + oldHelper + oldFunction.slice(last).replace('previousRunning, running, setExpanded);', 'previousRunning, running, setExpanded, EXPAND_THNK_OPTIONS);');
  assert.equal(patchSource(oldSource, true), original);
  assert.equal(patchSource(oldSource), patched);
});
