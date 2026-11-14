# DSH 0.2.2-rc.3 适配验证

验证日期：2026-11-14。插件版本：`0.3.9`。兼容范围保留 `0.2.1-rc.2`／`rc.3`／`rc.4`／`rc.5` 与 `0.2.2-rc.1`／`rc.2`，新增 `0.2.2-rc.3`。七个版本的真实官方 Chat 产物均执行回归；未修改运行中 profile、部署或重启服务。

## 官方产物来源

全部取自 `https://registry.npmjs.org`，未使用其他源码树或变体。按版本下载并解包以下八个包：`dsh`、`dsh-client-ui-chat`、`dsh-client-modules`、`dsh-settings`、`dsh-client-ui-settings`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-slots`、`dsh-client-locale`。tarball 的 SHA-1 与 registry `dist.shasum` 逐一比对一致。

Chat 下载地址：

```text
https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.3.tgz
```

| 版本       | npm shasum                                 | tarball integrity                                                                                 | `lib/client.js` 字节 | 原始 SHA-256                                                       | 补丁后 SHA-256                                                     |
| ---------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------: | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| 0.2.2-rc.3 | `8075cf39e622f6892df87714afb485fecf74cf46` | `sha512-D5+Kh4XQ+BKTPt7brGaRaOX+GNyb0KZpshUcIH8Mj4wT4TRj1lpT32tupykc4uTgFwbRdW0TIjEdYsaqP1My5A==` |               509182 | `eef53e82b8cd584d2f0e543a4a93395f9d90df3bba1218891bd99d07d788de5c` | `701fa3138c6d71435b55a2fee212d5d299dd30e4f1d6d10cf14244369d7decde` |

## rc.3 的关键变化：无产物变化

`0.2.2-rc.3` 的 `lib/client.js` 与 `0.2.2-rc.2` 逐字节相同（同为 509182 字节、SHA-256 `eef53e82…`），仍是压缩构建。已有压缩构建锚点、注入的辅助函数、限高／跟随滚动／收起动画逻辑和撤销回填全部直接复用，`patch-core.js` 的补丁主体没有改动，版本差异只体现在运行时白名单与 `engines.dsh`。

因此本版没有新增锚点分支；可读构建（`0.2.1-rc.2` 至 `0.2.2-rc.1`）与压缩构建（`0.2.2-rc.2` 起）两套布局保持原样。

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
node test.mjs dist/validation/rc3/chat/package/lib/client.js
node scripts/verify-client-api.mjs dist/validation/rc3
```

- 格式与语法检查通过。
- 默认离线回归：64 项中 62 项通过，真实产物专用 2 项按设计跳过。
- 真实 rc.3 产物：64/64 通过，包含补丁应用／幂等／撤销、历史补丁接管、Host 生命周期（应用、graph 回调不重复写入、停用还原）、设置保存与 revision 冲突、真实产物上的启用与停用。
- 真实产物测试隔离执行官方 `useDisclosure`，校验 setter、手动收起、连续 token 与 generation 重置；使用最小 state/callback 替身，不挂载 React 或 DOM。
- `scripts/verify-client-api.mjs` 对 rc.3 的解包产物核对 Host 与 Client 接口，全部通过，Chat 产物识别为 `minified` 布局，补丁、幂等与逐字节撤销均通过。
- `0.2.1-rc.2`、`rc.3`、`rc.4`、`rc.5`、`0.2.2-rc.1`、`rc.2` 的历史验证记录沿用 [rc.2 验证记录](./rc2-validation.md) 与 [rc.1 验证记录](./rc1-validation.md)，本次未重跑。

## 验证边界

未进行浏览器挂载／视觉回归，未连接真实 Host RPC，未验证运行中 profile 的安装与跨插件 HMR。压缩构建下的页面限高、跟随滚动、240ms 动画、外层分组互动、长期输入稳定性与浅色主题仍需获准安装后手动复核。共享同一 Chat 安装产物的多 profile 管理风险沿用 [README 的说明](../README.md#兼容范围与实现方式)。
