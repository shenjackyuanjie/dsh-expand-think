# DSH 0.2.3 Alpha 适配验证

验证日期：2026-11-22（UTC+8）。插件版本：`0.4.0`。验证使用公开 npm registry 的官方产物和隔离目录，不改动现有 profile、Harness 安装或配置。

## 官方产物

官方 [@deepseek-ai/dsh 发行元数据](https://registry.npmjs.org/@deepseek-ai%2fdsh) 中，`alpha` 为 `0.2.3-alpha.2`，`latest` 与 `next` 都为 `0.2.2-rc.5`。截至验证时，`0.2.2-rc.1` 至 `rc.5` 均已发布，暂无 `0.2.2` 正式版。本版完整保留这五个 RC 的兼容，移除 `0.2.1` 系列兼容。

RC1～RC5 与 Alpha.1 各下载九个同版本包：`dsh`、`dsh-app-boot`、`dsh-client-ui-chat`、`dsh-client-modules`、`dsh-settings`、`dsh-client-ui-settings`、`dsh-client-ui-plugin-manager`、`dsh-client-ui-slots`、`dsh-client-locale`。另下载 Alpha.2 的 Chat、Client Modules、Settings、Client Settings、Plugin Manager、Slots 和 Locale；归档的 SHA-1 与 SHA-512 均符合 registry 元数据。

| DSH／Chat 版本                                                                                                     | Chat 归档 SHA-1                            | Chat `lib/client.js` 字节数 | Chat 回归 |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | --------------------------: | --------: |
| `0.2.2-rc.1`                                                                                                       | `59f88cdd058215321c92fc53a314daa1dc8e0666` |                      688923 |     76/76 |
| `0.2.2-rc.2`                                                                                                       | `d0e16cfb05c18bd24ce036808698295d2689dda2` |                      509182 |     76/76 |
| `0.2.2-rc.3`                                                                                                       | `8075cf39e622f6892df87714afb485fecf74cf46` |                      509182 |     76/76 |
| `0.2.2-rc.4`                                                                                                       | `86c77aa5a09153b03e03391a58e40fc5f3999611` |                      509182 |     76/76 |
| `0.2.2-rc.5`                                                                                                       | `e693f2a19310b9731569ce0a0987bb84a86ca3c6` |                      509182 |     76/76 |
| [0.2.3-alpha.1](https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.3-alpha.1.tgz) | `ea9cf0f20b104597f01d2f55a0bb38e8a891f3f5` |                      515322 |     76/76 |
| [0.2.3-alpha.2](https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-chat/-/dsh-client-ui-chat-0.2.3-alpha.2.tgz) | `68471326b1dedcc891c47e6fc65394478f705106` |                      515322 |     76/76 |

`0.2.2-rc.1` 是可读构建（SHA-256 `b7e645f2461231e8ece31381f026db2df72d058e425eaef19265f215c823d84e`），因此仍保留其原有锚点。rc.2 至 rc.5 的压缩 Chat 文件逐字节相同（SHA-256 `eef53e82b8cd584d2f0e543a4a93395f9d90df3bba1218891bd99d07d788de5c`）。两版 Alpha 的 Chat 逐字节相同，SHA-256 是 `5ceff4bff4340f25646e087f9df017385c8f602ad05e7abd17d4c433d0a77fa5`：`ReasoningRow` 多了 `textInteractionSource` 属性，但补丁锚点仍唯一，流式尾区块的 `running` 与 `useDisclosure` 的布尔 setter 语义不变。现有补丁可直接复用，应用可编译、幂等，撤销能逐字节恢复官方文件。

## 复跑

将各版本的官方 Chat 包解压至 `dist/validation/alpha1-matrix/<version>/chat/package`，其他官方包解压至同一版本目录下各自的 `<包短名>/package`：

```powershell
pnpm run format:check
pnpm run check
pnpm test
foreach ($version in '0.2.2-rc.1', '0.2.2-rc.2', '0.2.2-rc.3', '0.2.2-rc.4', '0.2.2-rc.5', '0.2.3-alpha.1', '0.2.3-alpha.2') {
  $root = "dist/validation/alpha1-matrix/$version"
  node test.mjs "$root/chat/package/lib/client.js"
  node scripts/verify-client-api.mjs $root
}
pnpm run pack
```

- 离线回归 76 项：74 项通过，真实产物专用的 2 项按设计跳过。测试明确拒绝此前支持的四个 `0.2.1` RC、`0.2.1` 正式版及未验证的未来版本。
- 七版 Host 与 Client 接口检查通过：Client Modules 的路径查询、重建通知、graph 监听，Host Settings，Client ConfigForms、设置插槽与 Locale ABI。
- 在隔离目录安装本地 tgz，检查 Host 裸包入口、Client registration/factory、Locale 和图标 exports、Cordis overlay 及预发布 SemVer 门槛；使用归档的实际代码复跑上述七版矩阵，各通过 76/76。

## 官方宿主加载

- **Alpha.2：** 用官方 Node.js `v24.22.3` 在隔离 npm 安装中运行 `node node_modules/@deepseek-ai/dsh/lib/bin.js --version`，输出 `0.2.3-alpha.2`，退出码 0。依赖为官方 Cordis `4.2.0-alpha.1`、Loader `1.2.0-alpha.1`，未替换或垫片。
- **Alpha.2 插件启停：** 用同一个 Node 和官方 `dsh-app-boot` 启动临时 profile，经 `reconcileProfilePatches()` 加载打包后的插件。Loader 标记插件 ACTIVE，Client Modules 注册了模块，原生 Settings 返回五个默认值且未开启自动生成页面。应用和撤销各发出一次 Chat 重建通知，停用逐字节恢复官方 Chat。这里不启动完整 Web 服务。

## 验证限制

**Alpha.1 仅通过插件级验证，官方 CLI 与完整宿主加载未通过：**在 Node.js `v24.19.0` 的独立 npm 安装中，官方 `@deepseek-ai/dsh-app-boot@0.2.3-alpha.1` 导入其声明的公开 `@deepseek-ai/cordis-plugin-loader@1.1.0` 时缺少 `EntryValidationError` 导出，错误发生在宿主识别任何插件前。从官方 CLI 运行 `--version` 亦可触发，未修改或替换官方依赖。

产物测试用临时 Chat 文件和 state/callback 替身。未在当前 profile 安装，也未验证浏览器内真实流式渲染、视觉效果和跨插件 HMR。
