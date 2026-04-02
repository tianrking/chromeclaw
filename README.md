# Farito

Farito 是一个 Chrome MV3 浏览器 Agent 插件。

它的定位很直接：
- 读取当前页面的结构与语义信息
- 在可控策略下执行页面与浏览器操作
- 用“聊天 + 工具调用 + 审批流”完成复杂任务

## Highlights

- Chat-first 交互：实时执行轨迹、实时草稿、最终答案收敛
- Site-aware 策略：针对 YouTube / GitHub / Google / Generic 的流程增强
- 双层工具系统：
  - `page.*`（DOM、交互、观测、提取）
  - `browser.*`（tab、network、cookies、downloads、DNR、watcher）
- 安全策略：Mutation / High-risk 双策略 + 可选自动审批
- 主动感知：Watcher 模式（定时/条件触发 + action 执行）

## Product UX

- 主入口：Side Panel（推荐）
- 头部能力：`New Chat`、`Auto Approve`、`Options`
- 会话管理：支持新建会话、切换会话、删除/清空当前会话（持久化）
- 调试透明：执行中可见 tool 调用、turn、阻塞/错误原因

## Architecture

- `manifest.json`
- `background.js`
- `core/`
  - `agent-loop.js`
  - `tool-executor.js`
  - `policy-guard.js`
  - `approval-manager.js`
  - `tab-api.js`
  - `browser-tools/`
  - `watcher-*.js`
  - `constants.js` / `storage.js` / `shared-utils.js`
- `content/`
  - `entry.js`
  - `page-bridge.js`
  - `tools/`
  - `observability.js`
  - `scriptlet-engine.js`
- `providers/`
- `strategies/`
- `popup.*` / `sidepanel.*` / `options.*`

## Capabilities

### Page Tools (`page.*`)

- Snapshot & Context: `get_snapshot`, `get_html`, `get_text`, `get_page_context`
- Actions: `click`, `type`, `select`, `check`, `uncheck`, `scroll`, `keypress`, `wait_for`
- Extraction: `query_elements`, `extract`, `highlight`, `get_element_html`, `get_styles`
- Runtime: `eval_js`, `list_scriptlets`, `run_scriptlet`
- Observability: `get_network_log`, `get_console_log`, `watch_dom`, `get_performance`, `tap_websocket`

### Browser Tools (`browser.*`)

- Tabs & Navigation: `open_url`, `switch_tab`, `reload_tab`, `navigate_back`, `navigate_forward`, `close_tab`
- Data & Network: `http_request`, `http_history_*`, `get_cookies`, `set_cookie`, `delete_cookie`
- Downloads & Rules: `download*`, `dnr_*`
- Watchers: `watcher_create`, `watcher_list`, `watcher_pause`, `watcher_resume`, `watcher_remove`

## Providers

- OpenAI-compatible
- Anthropic-compatible
- Zhipu-compatible
- Z.AI Coding (Global / CN)
- Local heuristic fallback

## Install

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择项目目录

## Configuration

在 `Options` 中配置：
- Provider / Base URL / API Key / Model
- Response Format / Reasoning Effort / Temperature
- Max Turns / Max Snapshot Chars
- Mutation Policy / High-Risk Policy

## Notes

- `wait_for` 已支持自动重试（超时后自动延长一次）
- 审批动作已并入聊天流（直接 `Allow / Reject`）
- 可开启 `Auto Approve` 以减少中断

## Repository

- GitHub: [https://github.com/tianrking/Farito](https://github.com/tianrking/Farito)

## License

- Source-available license（见 `LICENSE`）
- 商业授权说明见 `LICENSE-COMMERCIAL.md`
