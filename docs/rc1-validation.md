# DSH 0.2.2-rc.1 适配验证

验证日期：2026-11-08。插件版本：`0.3.7`。兼容范围保留 `0.2.1-rc.2`／`rc.3`／`rc.4`／`rc.5`，新增 `0.2.2-rc.1`。发布前重新运行五个真实官方 Chat 产物矩阵，各 56/56 通过；未修改运行中 profile、部署或重启服务。

## 官方产物来源

从 `https://registry.npmjs.org` 获取下列 `@deepseek-ai/` 包的 `0.2.2-rc.1` 元数据与 tarball，未使用其他源码树或内部变体：`dsh`、`dsh-client-ui-chat`、`dsh-client-modules`、`dsh-settings`、`dsh-client-ui-settings`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-slots`、`dsh-client-locale`。八个 tarball 均计算 SHA-512 并与 registry 的 `dist.integrity` 逐一比对通过。

Chat 官方下载地址：

```text
https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.1.tgz
```

```text
Chat tarball integrity:
sha512-xyPgqo3h9J2gxVLBhRH7kag1MDhqgjQJagP+TSHSISJ8afMG6GtsmTeyArU5ITZeu8luNuWdb5jMBKmsjPOTLw==
lib/client.js 字节数：688923
原始 SHA-256：b7e645f2461231e8ece31381f026db2df72d058e425eaef19265f215c823d84e
补丁后 SHA-256：41909f4051fb314b6d79e3b7834cd378e4367b5bdc557489b03fc76bae29c5f6
```

## 实现核对

以下行号均指对应官方包解压后的产物，而非本仓库源码：

| 官方包／产物                                                                              | 已核对内容                                                                                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Chat `lib/client.js:4655–4665`                                                            | `useDisclosure(version = 0)` 返回 `expanded`、布尔 `setExpanded` 与 `toggle`；外层 generation 改变后折叠。               |
| Chat `lib/client.js:8200–8263`                                                            | `ReasoningRow` 仍在正文归一化前创建 disclosure；展开才挂载 Body Slot；手动回调、正文类名和根 `data-preview` 锚点均保留。 |
| Chat `lib/client.js:8329–8343`                                                            | reasoning 的 `running` 仍为 `streaming && i === last`，不是整轮任务状态；下一回答／工具区块出现即结束当前 reasoning。    |
| Client Modules `lib/types/index.d.ts:116,147,161`；`lib/index.js:644,687,724`             | `clientPath(id)`、`rebuilt(id)`、`onGraphChanged(listener)` 声明和实现保留，graph 订阅返回 disposer。                    |
| Host Settings `lib/types/index.d.ts:74–82`                                                | `configure({ auto: false }, ctx.fiber)` 仍返回 disposer，不改变 Config。                                                 |
| Client Settings `lib/types/client/config-form-types.d.ts:6–52`；`lib/client.js:1165,1294` | snapshot 保留 `status/value/revision/writable`；`get(entryId)`、`getSnapshot()`、`mutate(ops, expectedRevision)` 保留。  |
| Plugin Manager `lib/client.js:6022,7776–7778`                                             | `plugins.bundle.config` 为 root keyed 插槽，以包名选择详情页。                                                           |
| Slots `lib/types/index.d.ts:459–467,806–808`                                              | 注册 inject face 的 `hooks.settings` 仍绑定为组件 `useSettings`。                                                        |
| Locale `lib/types/client/index.d.ts:199`                                                  | namespace 与字典映射的 `register` 接口保留。                                                                             |

组件入口、disclosure 创建、手动开合、正文容器、根预览标记五个原始锚点均唯一命中。补丁可重复应用，反向撤销逐字节恢复原文，补丁后的完整脚本通过 `vm.Script` 编译。现有运行策略与锚点可复用，本次只增加精确支持版本，不新增兼容分支。

## 验证命令与结果

在项目根执行：

```powershell
pnpm run format:check
pnpm run check
pnpm test
node test.mjs dist/validation/rc1/dsh-client-ui-chat/package/lib/client.js
node dist/validation/verify-artifacts.mjs
pnpm run pack
```

- 格式与语法检查通过。
- 默认离线回归：56 项中 55 项通过，真实产物专用 1 项按设计跳过。
- 真实官方 rc.1 产物：56/56 通过，无跳过。包含应用／幂等／撤销、历史补丁接管、生命周期、保存不产生额外 HMR；额外隔离执行官方 `useDisclosure`，验证 setter、手动收起、连续 token、重新开始与 generation 重置。该测试使用最小 state/callback 替身，不挂载 React 或 DOM。
- 同样从公开 npm 下载的 `0.2.1-rc.2`、`rc.3`、`rc.4`、`rc.5` Chat 产物，各执行 `node test.mjs <对应 lib/client.js>`，均 56/56 通过。
- 发行包使用既有 `pnpm run pack` 生成；发布使用经检验的 `dist/shenjackyuanjie-dsh-expand-think-0.3.7.tgz`，继续保留全部五个精确版本声明。打包命令本身不推送或发布。

本地审查证据位于被 Git 忽略的 `dist/validation/`：rc.1 元数据、tarball 与解压产物在 `rc1/`；完整性／锚点证据为 `rc1/evidence.json`；真实产物日志为 `rc1/real-test.log`；默认离线日志为 `offline-test.log`；旧版产物日志位于各版本子目录。缓存不打入发行包。

## 验证边界

未进行浏览器挂载／视觉回归，未连接真实 Host RPC，未验证运行中 profile 的安装与跨插件 HMR。实际页面的限高、跟随滚动、240ms 动画、外层分组互动、长期输入稳定性与浅色主题仍需获准安装后手动复核。共享同一 Chat 安装产物的多 profile 管理风险沿用 [README 的说明](../README.md#兼容范围与实现方式)。
