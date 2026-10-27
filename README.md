# dsh-expand-think

**thinking 输出时自动展开，结束后自动收起，保留手动查看。**

可安装到 DeepSeek Harness 的 Cordis bundle，包名 `@shenjackyuanjie/dsh-expand-think`。安装后在 DSH 插件管理器中管理启用和停用，不需要手动运行补丁脚本。

## 效果

- 每段 thinking 开始流式输出时，自动展开原始思考正文。
- thinking 结束并转为回答、工具调用，或流式状态因停止／失败结束时，自动收起。
- 不等待整轮任务结束，按单个 thinking 区块的 `running` 状态切换。
- 输出中手动收起后，后续 token 不会反复把它展开。
- 结束后可以手动展开查看原文；历史 thinking 初次显示仍默认折叠。
- 不改变回答内容、工具调用、模型请求或会话记录，也不调用额外模型。

外层的“工作步骤展示”和过程分组仍遵循 DSH 原有设置。本插件只管理 thinking 自身的开合，不额外调整外层分组。

## 思考显示设置

在插件详情页的描述与“包含的组件”之间提供两个独立开关：

| 设置           | 配置字段       | 默认值 | 关闭后的行为                              |
| -------------- | -------------- | ------ | ----------------------------------------- |
| 输出时自动展开 | `autoExpand`   | 开启   | thinking 开始时不强制展开，仍可手动打开。 |
| 结束后自动收起 | `autoCollapse` | 开启   | thinking 结束时保留当时的开合状态。       |

修改后点击 **保存设置**，两项修改会一并保存到当前 profile 的原生配置。页面提供保存状态、放弃修改和只读提示；版本冲突或保存失败时保留草稿，不假装保存成功。离开页面会放弃未保存的修改。

两项都关闭时，仅保留 DSH 原有的手动开合。手动选择始终受到尊重，同一输出阶段不会因新 token 到来而反复自动切换。

保存只更新 DSH 原生配置，浏览器通过插件自有的只读桥接读取已接受的表单状态；**不改写 Chat 文件，也不触发 Chat 热更新**。新开关值从下一次 thinking 开始／结束切换起使用，不强行改变正在查看的正文。刷新和正常重启后仍保留已保存的值；配置尚未加载或桥接不可用时，保留原生手动开合。

设置只通过插件详情页和 DSH 原生 Config 管理，不注册 Agent 配置 Tool。

设置入口：**侧边栏 → 插件 → dsh-expand-think → 思考显示设置**。

## 兼容范围与实现方式

当前版本支持 **DSH `0.2.1-rc.2`、`0.2.1-rc.3` 与 `0.2.1-rc.4`**，对应的 **`@deepseek-ai/dsh-client-ui-chat` `0.2.1-rc.2`／`0.2.1-rc.3`／`0.2.1-rc.4`**。这三个版本的 `ReasoningRow` 锚点完全相同，共用同一份补丁、没有版本分支。更早的宿主版本不再适配：不符合版本要求时停止激活，也不申请兼容性豁免。

当前 DSH 的 reasoning Body Slot 仅在正文已经展开后挂载，无法控制外层开合。因此，这一版采用 **Host 插件管理的最小本地前端补丁**，不是 DOM 点击模拟，也不复制整套 Chat renderer。

插件从 `clientModules.clientPath()` 获取实际前端产物，校验包版本和唯一代码锚点，再通过原子替换添加状态同步逻辑。完成后调用 `clientModules.rebuilt()`，由 DSH 原生 HMR 发布前端新版本。

- **启用／启动：** 应用补丁。
- **停用／卸载／正常退出：** 只反向移除本补丁，保留其他位置的用户修改。
- **其他代码已经修改了补丁内部：** 保留文件并记录诊断，不用旧备份覆盖新代码。
- **进程被强制终止：** 磁盘补丁可能保留；再次启用时会识别并接管。

这是磁盘级前端补丁。同一台机器上，其他 profile 或进程若共用同一份 Chat 前端产物，也可能受到影响；建议只由一个 DSH 实例管理该产物。安装目录需要可写。后续 DSH 版本应重新核对扩展接口和代码锚点。

## 安装与使用

### 安装打包产物

在 DSH 插件管理器中选择本地 `shenjackyuanjie-dsh-expand-think-0.3.2.tgz` 安装，然后启用 **dsh-expand-think · 思考自动展开**。

命令行也可通过 DSH 自己的插件入口安装。以下命令在安装了 DSH 的目录执行，`web` 替换为实际 profile：

```powershell
pnpm dsh plugin --profile web add "D:\路径\shenjackyuanjie-dsh-expand-think-0.3.2.tgz"
```

默认两项均开启。插件启用或停用时仍需应用／撤销一次前端补丁，可能触发一次 Chat 更新；保存开关不触发该流程。

### 从 GitHub Packages 安装

包已发布到 GitHub Packages：`@shenjackyuanjie/dsh-expand-think`。GitHub 的 npm registry 读取公开包也需要认证，使用具备 `read:packages` 的 classic PAT 在本机登录（不要提交 token）：

```powershell
npm config set '@shenjackyuanjie:registry' 'https://npm.pkg.github.com' --location=user
npm login --scope=@shenjackyuanjie --auth-type=legacy --registry=https://npm.pkg.github.com
pnpm dsh plugin --profile web add @shenjackyuanjie/dsh-expand-think@0.3.1
```

登录时 Username 填 GitHub 用户名，Password 填 PAT。首次发布后需在 GitHub 的 Package settings 中确认包可见性为 Public。

**从 0.2.2 及更早版本升级：** 包名已改为 `@shenjackyuanjie/dsh-expand-think`，行 id 为 `dsh-expand-think`。先在插件管理器卸载旧的 `dsh-expand-thnk`，再安装新包；旧包名的设置不会迁移，新包装好后按默认值（两项均开启）开始。旧版本留下的本地补丁会在新插件启用时被识别并接管，不需要手动清理。

### 停用或卸载

在 DSH 插件管理器中停用或卸载 `dsh-expand-think`。正常停用会撤销思考区块补丁，并通知前端更新。

启用期间不要另外运行手工脚本修改 Chat 产物，以免造成两个管理入口互相覆盖。

## 开发与打包

项目使用 Node.js 内置模块，以及 DSH 同版本的 `@deepseek-ai/schemastery` 声明原生 Config；无安装脚本、无编译构建步骤。Client 使用宿主 React，不打包另一份 React。代码风格由 Prettier 统一。

```powershell
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run check
pnpm test
pnpm run pack
```

需要改写格式时执行 `pnpm run format`。

生成的归档位于 `dist/`。发行文件白名单由 [package.json](./package.json) 的 `files` 字段控制，不包含测试、Git 数据、备份、日志或凭据。

也可以把实际安装的 Chat 前端产物路径传给测试，验证真实版本的精确代码锚点：

```powershell
node test.mjs "D:\实际路径\dsh-client-ui-chat\lib\client.js"
```

## 文件结构

- [index.js](./index.js)：Host 生命周期、版本验证、原子写入、HMR 与停用还原。
- [patch-core.js](./patch-core.js)：纯文本补丁与 thinking 状态边沿同步策略。
- [settings.js](./settings.js)：两个原生 volatile Config 字段。
- [client.js](./client.js)：插件详情页中的两项开关、草稿和保存提示。
- [cordis.patch.yml](./cordis.patch.yml)：向当前 profile 插入正式插件条目。
- [test.mjs](./test.mjs)：离线回归，不登录、不调用模型、不模拟 React 或 DOM。
- [locale/zh.json](./locale/zh.json)、[locale/en.json](./locale/en.json)：插件标题和描述。
- [icon.svg](./icon.svg)：本项目原创的展开／收起图标。
- [CHANGELOG.md](./CHANGELOG.md)：版本记录。

## 验证边界

45 项离线测试覆盖自动开合、四种开关组合、手动选择保留、多区块隔离、历史默认折叠、插件启停、三个受支持宿主版本、设置保存和版本冲突、保存不产生额外 HMR、只读配置桥接及清理、不注册额外配置 Tool、包名与插槽标识一致、HMR 回调重入、延后挂载、版本拒绝，以及不覆盖其他修改。可用最小 fixture 或只读的真实 Chat 产物执行，生命周期测试仅修改隔离临时目录。

0.1.0 的核心开合逻辑曾由使用者在当前 DSH 页面确认正常。0.2.0 连续保存设置的热更新验证期间，使用者报告输入框频繁消失，停用后恢复；0.2.1 已移除保存时重载 Chat 的路径，并经使用者重启后截图确认两个开关显示正常。0.3.0 改用新包名、收敛到当前宿主版本并移除旧补丁迁移代码，重新安装后需要在页面上复核。长时间输入框稳定性与浅色主题仍未完成实际页面复核；离线测试不能替代这部分验证。

## 发布状态

源码公开托管于 [GitHub：shenjackyuanjie/dsh-expand-think](https://github.com/shenjackyuanjie/dsh-expand-think)，包发布在 GitHub Packages 的 `@shenjackyuanjie` scope 下。

发布用 `pnpm publish`（`publishConfig` 已固定 registry 与 public 访问）。GitHub 的包可见性不自动继承仓库，首次发布后需在 Package settings 中确认 Public。

以 [MIT 许可证](./LICENSE)发布。
