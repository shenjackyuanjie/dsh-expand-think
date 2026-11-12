// 核对插件实际使用的 Host 与 Client 接口；参数为按 `<包短名>/package` 解压的官方产物目录。
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { layoutOf, patchSource } from '../patch-core.js';

const root = resolve(process.argv[2] ?? '');
if (process.argv[2] === undefined) {
  console.error('用法：node scripts/verify-client-api.mjs <解压产物根目录>');
  process.exit(2);
}

const failures = [];
function read(file) {
  try {
    return readFileSync(resolve(root, file), 'utf8');
  } catch (error) {
    failures.push(file + ' 读取失败：' + error.message);
    return '';
  }
}
function expect(label, text, needle) {
  if (!text.includes(needle)) failures.push(label + ' 缺少 ' + JSON.stringify(needle));
}

const chat = read('chat/package/lib/client.js');
if (chat !== '') {
  const layout = layoutOf(chat);
  const patched = patchSource(chat);
  new Script(patched);
  if (patchSource(patched, true) !== chat) failures.push('Chat 补丁无法逐字节撤销');
  if (patchSource(patched) !== patched) failures.push('Chat 补丁不幂等');
  const markers = [
    'data-dsh-et-clamped',
    'data-dsh-et-closing',
    'dsh-et-body',
    'requestAnimationFrame(follow)',
  ];
  for (const marker of markers) expect('补丁输出', patched, marker);
  console.log('Chat 产物：' + layout + '，补丁、幂等、撤销与编译通过');
}

const modules = read('dsh-client-modules/package/lib/types/index.d.ts');
expect('client-modules', modules, 'clientPath(id: string)');
expect('client-modules', modules, 'rebuilt(id: string)');
expect('client-modules', modules, 'onGraphChanged(listener: () => void)');

const settings = read('dsh-settings/package/lib/types/index.d.ts');
expect('host settings', settings, 'configure(presentation:');

const forms = read('dsh-client-ui-settings/package/lib/types/client/config-form.d.ts');
expect('configForms', forms, 'class ConfigForms');
expect('configForms', forms, 'get<T>(entryId: string)');
expect('configForms', forms, 'getSnapshot(): ConfigFormSnapshot<T>');
expect('configForms', forms, 'mutate(ops: readonly SettingsPathOpView[]');

const manager = read('dsh-client-ui-plugin-manager/package/lib/client.js');
// 官方产物在可读与压缩两种构建下写法不同，先归一化空白与引号再比对。
const squash = (text) => text.replaceAll('`', '"').replace(/\s+/gu, '');
expect('plugin manager', squash(manager), '"plugins.bundle.config":{kind:"keyed",scope:"root"}');
expect('plugin manager 运行时', manager, 'slots.inject(');
expect('plugin manager 运行时', manager, 'slots.register(');

const locale = read('dsh-client-locale/package/lib/types/client/index.d.ts');
expect('locale', locale, 'LocaleDictOf');
expect('locale', locale, 'dicts:');

if (failures.length > 0) {
  for (const failure of failures) console.error('✖ ' + failure);
  process.exit(1);
}
console.log('✔ Host 与 Client 接口核对通过：' + root);
