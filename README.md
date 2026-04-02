# ChromeClaw Agent

ChromeClaw 是一个工程化的 MV3 浏览器 Agent 插件，目标是“对任意网站做提取、分析、处理、自动化”。

## 项目结构

- `manifest.json`
- `background.js`: 入口编排
- `core/`
  - `agent-loop.js`: Agent 主循环（控制流）
  - `prompt-builder.js`: system prompt 与初始消息构建
  - `policy-guard.js`: mutation/high-risk 策略判定与审批
  - `tool-executor.js`: 工具执行与策略回退
  - `browser-tools/`: browser tool 按功能拆分 + 注册表
  - `shared-utils.js`: JSON/截断等通用函数
  - `approval-manager.js`: 高风险动作审批流
  - `tool-definitions.js`: 全部工具 schema（统一声明）
  - `tab-api.js`: Chrome tab / content 通信抽象
  - `storage.js`: 配置存储抽象
  - `constants.js`: 默认配置与安全策略
- `providers/`
  - `base.js`: provider 抽象接口
  - `openai-compatible.js`: OpenAI 兼容实现
  - `anthropic-compatible.js`: Anthropic/Claude 兼容实现（tool use 适配）
  - `local-heuristic.js`: 本地兜底实现
  - `registry.js`: provider 选择工厂
- `content/`
  - `hook-start.js` / `hook-end.js`: 文档生命周期 hook（document_start/document_end）
  - `page-bridge.js`: 页面世界（page world）桥接执行层
  - `tools/`: page tool 注册表与分模块实现
  - `scriptlet-engine.js`: 内置 scriptlet 运行时（用户脚本风格能力）
  - `dom-utils.js`: DOM 通用能力
  - `page-tools.js`: 页面工具运行入口（调度器）
  - `entry.js`: content 脚本消息入口
- `popup.*`: 插件弹窗 UI
- `sidepanel.html` / `sidepanel.css`: 常驻 Side Panel UI（推荐入口）
- `options.*`: 配置页 UI
- `strategies/`
  - `registry.js`: 策略选择器（按站点分派）
  - `google.js` / `youtube.js` / `github.js` / `generic.js`

## 工具能力（可被 Agent 调用）

页面工具：

- `page.get_snapshot`: 结构化全量页面快照（meta/headings/links/forms/tables/scripts/stats...）
- `page.get_html`
- `page.get_text`
- `page.get_page_context`
- `page.eval_js`（高风险）
- `page.list_scriptlets`
- `page.run_scriptlet`（高风险）
- `page.tap_websocket`（高风险）
- `page.get_websocket_events`
- `page.clear_websocket_events`
- `page.get_network_log`
- `page.get_console_log`
- `page.watch_dom`
- `page.get_performance`
- `page.get_accessibility_outline`
- `page.get_storage`
- `page.get_cookie_map`
- `page.get_styles`
- `page.get_element_html`
- `page.query_elements`
- `page.wait_for`
- `page.keypress`
- `page.click`
- `page.type`
- `page.select`
- `page.check`
- `page.uncheck`
- `page.scroll`
- `page.extract`
- `page.highlight`

浏览器工具：

- `browser.get_tab_context`
- `browser.list_tabs`
- `browser.capture_visible`
- `browser.open_url`
- `browser.switch_tab`
- `browser.reload_tab`
- `browser.navigate_back`
- `browser.navigate_forward`
- `browser.close_tab`
- `browser.http_request`（高风险，GM_xmlhttpRequest 风格）
- `browser.http_history_list` / `browser.http_history_get` / `browser.http_history_clear`
- `browser.download` / `browser.download_batch` / `browser.download_status` / `browser.download_cancel`
- `browser.get_cookies` / `browser.set_cookie` / `browser.delete_cookie`（支持 httpOnly）
- `browser.dnr_set_rules` / `browser.dnr_list_rules` / `browser.dnr_clear_rules`

## 模式

- 本地模式（无 API Key）：启发式提取/总结/链接分析
- 云端模式（有 API Key）：通过 tool-calling 自动执行多步任务

## 安装

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 加载目录：`/Users/w0x7ce/Downloads/AABBCCDD/chromeclaw`

## 配置

在 Options 配置：

- Provider
- 支持：`OpenAI Compatible`、`Anthropic Compatible`、`Zhipu (GLM)`、`Z.AI Coding Plan (Global/CN)`
- Base URL
- API Key
- Model
- Response Format（`default` / `coding_plan`）
- Reasoning Effort（`off` / `low` / `medium` / `high`，ZAI/智谱可用）
- Temperature
- Max Turns
- Max Snapshot Chars
- Mutation Policy（`auto` / `confirm` / `block`）
- High-Risk Policy（`confirm` / `auto` / `block`）
- Auto Execute（是否自动执行变更型动作）

弹窗包含 `Approval Queue`，会显示 `risk`，并支持逐步审批。

### Z.AI Coding Plan 快速配置

- Provider: `Z.AI Coding Plan (Global)`
  - Base URL: `https://api.z.ai/api/coding/paas/v4`
  - Model: `glm-5`（可改 `glm-4.7`）
  - Response Format: `coding_plan`

- Provider: `Z.AI Coding Plan (China)`
  - Base URL: `https://open.bigmodel.cn/api/coding/paas/v4`
  - Model: `glm-5`（可改 `glm-4.7`）
  - Response Format: `coding_plan`

## 建议

- 先关闭 `Auto Execute`，观察 Agent 规划质量
- 对敏感网站使用专门浏览器 profile
- 复杂流程先用 `page.query_elements + page.highlight` 校准定位再点击

## 许可与商用

本项目采用**源码可见许可（Source-Available）**：

- 非商业用途：允许使用、修改与分发
- 商业用途：需要购买商业授权
- 二次开发与再分发：必须保留署名并明确引用原始来源

请阅读：

- `LICENSE`
- `LICENSE-COMMERCIAL.md`
