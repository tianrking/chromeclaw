<p align="center">
  <img src="assets/farito-logo.svg" alt="Farito logo" width="680" />
</p>

<p align="center">
  <strong>Farito</strong> comes from Spanish <em>faro</em> (lighthouse) + <em>-ito</em> (small): <strong>"little lighthouse"</strong>.
</p>

<p align="center">
Your browser is a sea. Every webpage is an island.  
Farito is the small lighthouse beside you: quiet, precise, and always on.
</p>

<p align="center">
  <a href="docs/README.zh-CN.md">中文</a> ·
  <a href="docs/README.es.md">Español</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Manifest-MV3-0ea5e9" alt="MV3"/>
  <img src="https://img.shields.io/badge/Runtime-Service%20Worker-0369a1" alt="Service Worker"/>
  <img src="https://img.shields.io/badge/UI-Side%20Panel%20%2B%20Chat-0f766e" alt="UI"/>
  <img src="https://img.shields.io/badge/Language-JavaScript-f59e0b" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Status-Active-16a34a" alt="Status"/>
</p>

## What Farito Is

Farito is a Chrome MV3 browser-agent extension for:
- reading deep page context (DOM, UI, text, runtime state)
- executing controlled actions with policy/approval guardrails
- running multi-step web workflows through a chat-first interface

## Why It Feels Different

- **Page-native perception**: directly operates where users already browse/log in
- **Tool transparency**: live tool-call timeline + debug trace
- **Approval controls**: auto/manual policy, inline Allow/Reject flow in chat
- **Watcher mode**: proactive monitoring + trigger-based actions

## Tech Stack / Tags

- **Platform**: Chrome Extension Manifest V3
- **Background**: Service Worker + alarms + tabs events
- **Content Runtime**: DOM tools, observability hooks, scriptlets, websocket tap
- **Agent Runtime**: tool-calling loop, site strategy layer, policy guard, retries
- **Providers**: OpenAI-compatible, Anthropic-compatible, Zhipu-compatible, Z.AI Coding
- **Storage**: `chrome.storage.local` for settings, sessions, watcher state

## Core Capabilities

### Page Tools (`page.*`)
- inspect/snapshot/context (`get_snapshot`, `get_page_context`, `get_html`, `get_text`)
- interaction (`click`, `type`, `select`, `scroll`, `keypress`, `wait_for`)
- extraction (`query_elements`, `extract`, `highlight`, `get_element_html`, `get_styles`)
- runtime and observability (`eval_js`, `watch_dom`, `get_network_log`, `get_console_log`, `get_performance`)

### Browser Tools (`browser.*`)
- tabs/navigation (`open_url`, `switch_tab`, `reload_tab`, `navigate_back`, `navigate_forward`)
- network/cookies/downloads (`http_request`, `get_cookies`, `download*`, `dnr_*`)
- proactive automation (`watcher_create`, `watcher_list`, `watcher_pause`, `watcher_resume`, `watcher_remove`)

## UX Snapshot

- Chat-first side panel
- Real-time draft output while the agent is thinking
- Session management (new/switch/delete/clear)
- Inline approval actions (Allow / Reject)
- One-click Auto Approve toggle

## Install

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select this project folder

## Repo

- GitHub: [https://github.com/tianrking/Farito](https://github.com/tianrking/Farito)

## License

- Source-available: see `LICENSE`
- Commercial terms: see `LICENSE-COMMERCIAL.md`
