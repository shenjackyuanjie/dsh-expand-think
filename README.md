# dsh-expand-thnk

**thinking 输出时自动展开，结束后自动收起，保留手动查看。**

这是可安装到 DeepSeek Harness 的 Cordis bundle，名称按 `dsh-expand-thnk` 保留。安装后在 DSH 插件管理器中管理启用和停用，不需要每次启动手动运行补丁脚本。

## 效果

- 每段 thinking 开始流式输出时，自动展开原始思考正文。
- thinking 结束并转为回答、工具调用，或流式状态因停止／失败结束时，自动收起。
- 不等待整轮任务结束，按单个 thinking 区块的 `running` 状态切换。
- 输出中手动收起后，后续 token 不会反复把它展开。
- 结束后可以手动展开查看原文；历史 thinking 初次显示仍默认折叠。
- 不改变回答内容、工具调用、模型请求或会话记录，也不调用额外模型。

外层的“工作步骤展示”和过程分组仍遵循 DSH 原有设置。本插件只管理 thinking 自身的开合，不额外调整外层分组。

## 兼容范围与实现方式

当前版本支持 **DSH `0.2.1-rc.2`** 和 **`@deepseek-ai/dsh-client-ui-chat@0.2.1-rc.2`**。不符合版本要求时停止激活，不申请兼容性豁免。

当前 DSH 的 reasoning Body Slot 仅在正文已经展开后挂载，无法控制外层开合。因此，这一版采用 **Host 插件管理的最小本地前端补丁**，不是 DOM 点击模拟，也不复制整套 Chat renderer。

插件从 `clientModules.clientPath()` 获取实际前端产物，校验包版本和唯一代码锚点，再通过原子替换添加状态同步逻辑。完成后调用 `clientModules.rebuilt()`，由 DSH 原生 HMR 发布前端新版本。

- **启用／启动：** 应用补丁；若存在本项目早期的手动补丁，则接管其生命周期。
- **停用／卸载／正常退出：** 只反向移除本补丁，保留其他位置的用户修改。
- **其他代码已经修改了补丁内部：** 保留文件并记录诊断，不用旧备份覆盖新代码。
- **进程被强制终止：** 磁盘补丁可能保留；再次启用时会识别并接管。

这是磁盘级前端补丁。同一台机器上，其他 profile 或进程若共用同一份 Chat 前端产物，也可能受到影响；建议只由一个 DSH 实例管理该产物。安装目录需要可写。后续 DSH 版本应重新核对扩展接口和代码锚点。

## 安装与使用

### 安装打包产物

在 DSH 插件管理器中选择本地 `dsh-expand-thnk-0.1.0.tgz` 安装，然后启用 **dsh-expand-thnk · 思考自动展开**。

命令行也可通过 DSH 自己的插件入口安装。以下命令在安装了 DSH 的目录执行，`web` 替换为实际 profile：

```powershell
pnpm dsh plugin --profile web add "D:\路径\dsh-expand-thnk-0.1.0.tgz"
```

启用后无需配置。DSH Web 的 HMR 会发布更新；页面未同步时刷新一次即可。无需为这项前端改动重启正在工作的 Agent。

### 停用或卸载

在 DSH 插件管理器中停用或卸载 `dsh-expand-thnk`。正常停用会撤销思考区块补丁，并通知前端更新。

正式插件接管之后，不再需要运行早期手动补丁脚本。启用期间也不要另外运行旧脚本进行撤销，以免造成两个管理入口互相覆盖。

## 开发与打包

项目使用 Node.js 内置模块，无第三方运行时依赖、无安装脚本、无构建步骤。

```powershell
pnpm run check
pnpm test
pnpm run pack
```

生成的归档位于 `dist/`。发行文件白名单由 [package.json](./package.json) 的 `files` 字段控制，不包含测试、Git 数据、备份、日志或凭据。

也可以把实际安装的 Chat 前端产物路径传给测试，验证真实版本的精确代码锚点：

```powershell
node test.mjs "D:\实际路径\dsh-client-ui-chat\lib\client.js"
```

## 文件结构

- [index.js](./index.js)：Host 生命周期、版本验证、原子写入、HMR 与停用还原。
- [patch-core.js](./patch-core.js)：纯文本补丁与 thinking 状态边沿同步策略。
- [cordis.patch.yml](./cordis.patch.yml)：向当前 profile 插入正式插件条目。
- [test.mjs](./test.mjs)：离线回归，不登录、不调用模型、不模拟 React 或 DOM。
- [locale/zh.json](./locale/zh.json)、[locale/en.json](./locale/en.json)：插件标题和描述。
- [icon.svg](./icon.svg)：本项目原创的展开／收起图标。
- [CHANGELOG.md](./CHANGELOG.md)：版本记录。

## 验证边界

离线测试覆盖自动开合、手动选择保留、多区块隔离、历史默认折叠、旧补丁接管、插件启停、HMR 回调重入、延后挂载、版本拒绝，以及不覆盖其他修改。

核心开合逻辑已由使用者在当前 DSH 页面确认正常。浏览器端视觉结果不由离线测试替代；最终以实际页面效果为准。

## 发布状态

源码公开托管于 [GitHub：shenjackyuanjie/dsh-expand-thnk](https://github.com/shenjackyuanjie/dsh-expand-thnk)。

当前支持本地打包与安装，尚未发布到 npm。`private: true` 仅用于防止意外发布 npm 包，不影响 GitHub 仓库公开可见性。当前授权状态保持 `UNLICENSED`，尚未附加对外使用许可证。
