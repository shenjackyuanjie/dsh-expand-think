# DSH 0.2.2-rc.4／rc.5 适配验证

验证日期：2026-11-18。插件版本：`0.3.10`。两版均取自公开 npm registry，未安装到现有 profile，也未重启 DSH。

## 官方产物

分别下载八个同版本的官方包：`dsh`、`dsh-client-ui-chat`、`dsh-client-modules`、`dsh-settings`、`dsh-client-ui-settings`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-slots`、`dsh-client-locale`。十六个归档的 SHA-1、SHA-512 均匹配 registry 元数据。

| 版本                                                                                                         | Chat tarball SHA-1                         | `lib/client.js` 字节 | `lib/client.js` SHA-256                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | -------------------: | ------------------------------------------------------------------ |
| [0.2.2-rc.4](https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.4.tgz) | `86c77aa5a09153b03e03391a58e40fc5f3999611` |               509182 | `eef53e82b8cd584d2f0e543a4a93395f9d90df3bba1218891bd99d07d788de5c` |
| [0.2.2-rc.5](https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.2-rc.5.tgz) | `e693f2a19310b9731569ce0a0987bb84a86ca3c6` |               509182 | `eef53e82b8cd584d2f0e543a4a93395f9d90df3bba1218891bd99d07d788de5c` |

两版 Chat 与 [rc.3](./rc3-validation.md) 及 rc.2 逐字节相同。`0.3.9` 在自动加载时因版本白名单拒绝两版；本版扩展 `engines.dsh` 和运行时白名单，补丁锚点和实现逻辑不变。

## 验证命令与结果

```powershell
pnpm run format:check
pnpm run check
pnpm test
foreach ($rc in 4, 5) {
  node test.mjs "dist/validation/rc$rc/chat/package/lib/client.js"
  node scripts/verify-client-api.mjs "dist/validation/rc$rc"
}
pnpm run pack
```

- 离线回归 68 项：66 项通过，真实产物专用的 2 项按设计跳过。
- rc.4 与 rc.5 官方 Chat 产物各通过 68/68：实际执行官方 `useDisclosure`，验证流式尾区块自动展开、结束收起、连续 token 不覆盖手动操作；验证 Host 启用、HMR 通知、停用和逐字节还原。
- 两版 ABI 检查均通过：`clientPath`、`rebuilt`、`onGraphChanged`、Host `settings.configure`、`ConfigForms`、`plugins.bundle.config` 配置插槽与 Locale 接口保留；补丁正确编译、幂等且可撤销。
- 使用临时文件与 state/callback 替身，未挂载浏览器 React/DOM、连接真实 Host RPC 或验证在当前 profile 内跨插件 HMR。
