# DSH 0.2.2-rc.2 适配验证

验证日期：2026-11-12。插件版本：`0.3.8`。兼容范围保留 `0.2.1-rc.2`／`rc.3`／`rc.4`／`rc.5` 与 `0.2.2-rc.1`，新增 `0.2.2-rc.2`。六个版本的真实官方 Chat 产物均执行回归；未修改运行中 profile、部署或重启服务。

## 官方产物来源

全部取自 `https://registry.npmjs.org`，未使用其他源码树或变体。按版本下载并解包以下八个包：`dsh`、`dsh-client-ui-chat`、`dsh-client-modules`、`dsh-settings`、`dsh-client-ui-settings`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-slots`、`dsh-client-locale`。tarball 的 SHA-1 与 registry `dist.shasum` 逐一比对一致。

Chat 下载地址：

```text
https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.1.tgz
https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.2.tgz
```

| 版本       | tarball integrity                                                                                 | `lib/client.js` 字节 | 原始 SHA-256                                                       | 补丁后 SHA-256                                                     |
| ---------- | ------------------------------------------------------------------------------------------------- | -------------------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 0.2.2-rc.1 | `sha512-xyPgqo3h9J2gxVLBhRH7kag1MDhqgjQJagP+TSHSISJ8afMG6GtsmTeyArU5ITZeu8luNuWdb5jMBKmsjPOTLw==` |               688923 | `b7e645f2461231e8ece31381f026db2df72d058e425eaef19265f215c823d84e` | `41909f4051fb314b6d79e3b7834cd378e4367b5bdc557489b03fc76bae29c5f6` |
| 0.2.2-rc.2 | `sha512-nsVoj3ddh4YVakbzREEl4N2BLm7Mzvg4yjk3lsw5hVRxFHckGsyd5OnxJAhfKEDagK721cy8LQ1v4Ep3m5M6pw==` |               509182 | `eef53e82b8cd584d2f0e543a4a93395f9d90df3bba1218891bd99d07d788de5c` | `701fa3138c6d71435b55a2fee212d5d299dd30e4f1d6d10cf14244369d7decde` |

## rc.2 的关键变化：压缩构建

`0.2.2-rc.2` 的 `lib/client.js` 由带缩进换行的可读构建改为压缩构建：正文基本成单行，锚点之间的空白、引号写法都不同。原有锚点在 rc.2 上全部不再命中，因此补丁核心改为按构建形态选择锚点：

| 锚点     | 可读构建（0.2.1-rc.2 至 0.2.2-rc.1）                          | 压缩构建（0.2.2-rc.2）                                     |
| -------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| 组件     | `const ReasoningRow = (0, react.memo)(function ReasoningRow(` | `const ReasoningRow=(0,react.memo)(function ReasoningRow(` |
| 开合状态 | `const { expanded, toggle } = useDisclosure();`               | `const{expanded,toggle}=useDisclosure();`                  |
| 手动开合 | `onToggle: toggle,`（含原有缩进和换行）                       | `expandOnRowClick:true,onToggle:toggle,collapsedContent`   |
| 正文容器 | `className: ReasoningRow_module_css_default.thinkBody,`       | `className:ReasoningRow_module_css_default.thinkBody`      |
| 预览标记 | `"data-preview": preview &#124;&#124; void 0,`                | `"data-preview":preview&#124;&#124;void 0`                 |

压缩构建里 `onToggle:toggle,` 出现两次（ReasoningRow 与 GenericCommandCard），所以锚点带上 `expandOnRowClick:true` 与 `collapsedContent` 才能唯一命中。

注入的辅助函数与开合逻辑两种构建共用同一份文本；只有被替换的原始锚点不同。撤销时按当前构建形态回填对应原文，保证逐字节还原。

## 接口核对

以下条目对应官方包解压后的产物：

| 官方包／产物                                        | 已核对内容                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat `lib/client.js`                                | `ReasoningRow` 仍以 `streaming && i === last` 表示分段 `running`；展开才挂载 reasoning Body Slot；`useDisclosure` 仍返回布尔 `setExpanded`。 |
| Client Modules `lib/types/index.d.ts`               | `clientPath(id)`、`rebuilt(id)`、`onGraphChanged(listener)` 保留。                                                                           |
| Host Settings `lib/types/index.d.ts`                | `configure({ auto: false }, ctx.fiber)` 保留。                                                                                               |
| Client Settings `lib/types/client/config-form.d.ts` | `class ConfigForms`、`get<T>(entryId)`、`ConfigFormSnapshot`、`mutate(ops, expectedRevision)` 保留。                                         |
| Plugin Manager `lib/client.js`                      | `plugins.bundle.config` 仍为 `keyed`／`root` 插槽；`slots.inject(`、`slots.register(` 仍在使用。                                             |
| Locale `lib/types/client/index.d.ts`                | 字典注册保留（`LocaleDictOf`、`dicts:`）。                                                                                                   |
| Client UI Slots                                     | 插槽注册与注入接口保留。                                                                                                                     |

## 验证命令与结果

在项目根执行：

```powershell
pnpm run format:check
pnpm run check
pnpm test
node test.mjs dist/validation/rc1/chat/package/lib/client.js
node test.mjs dist/validation/rc2/chat/package/lib/client.js
node scripts/verify-client-api.mjs dist/validation/rc1
node scripts/verify-client-api.mjs dist/validation/rc2
pnpm run pack
```

- 格式与语法检查通过。
- 默认离线回归：62 项中 60 项通过，真实产物专用 2 项按设计跳过。
- 真实 rc.1 产物：62/62 通过；真实 rc.2 产物：62/62 通过。两者都包含补丁应用／幂等／撤销、历史补丁接管、Host 生命周期（应用、graph 回调不重复写入、停用还原）、设置保存与 revision 冲突、真实产物上的启用与停用。
- 真实产物测试还隔离执行官方 `useDisclosure`，校验 setter、手动收起、连续 token 与 generation 重置；使用最小 state/callback 替身，不挂载 React 或 DOM。
- 同样从公开 npm 下载的 `0.2.1-rc.2`、`rc.3`、`rc.4`、`rc.5` Chat 产物各执行一次真实产物测试，均 62/62 通过。
- `scripts/verify-client-api.mjs` 对 rc.1／rc.2 的解包产物核对 Host 与 Client 接口，两版均通过。

## 验证边界

未进行浏览器挂载／视觉回归，未连接真实 Host RPC，未验证运行中 profile 的安装与跨插件 HMR。压缩构建下的页面限高、跟随滚动、240ms 动画、外层分组互动、长期输入稳定性与浅色主题仍需获准安装后手动复核。共享同一 Chat 安装产物的多 profile 管理风险沿用 [README 的说明](../README.md#兼容范围与实现方式)。
