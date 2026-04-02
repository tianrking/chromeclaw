export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'page.get_snapshot',
      description: 'Get a comprehensive structured snapshot of current page.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_html',
      description: 'Get current page HTML, optional truncate by maxChars.',
      parameters: {
        type: 'object',
        properties: { maxChars: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_page_context',
      description: 'Get rich runtime context: location/document/window/navigator/performance/stylesheets/runtime.',
      parameters: {
        type: 'object',
        properties: {
          includeGlobals: { type: 'boolean' },
          globalKeys: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_text',
      description: 'Get visible text from page body.',
      parameters: {
        type: 'object',
        properties: { maxChars: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.eval_js',
      description: 'Execute JavaScript in page world and return serialized result. High-risk.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          args: { type: 'object' },
          timeoutMs: { type: 'number' }
        },
        required: ['code'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.list_scriptlets',
      description: 'List built-in scriptlets and metadata.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.run_scriptlet',
      description: 'Execute a built-in scriptlet by name.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          args: { type: 'object' }
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.tap_websocket',
      description: 'Enable/disable WebSocket message tapping on current page.',
      parameters: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          maxEvents: { type: 'number' },
          includeBinary: { type: 'boolean' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_websocket_events',
      description: 'Read captured WebSocket events.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          clear: { type: 'boolean' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.clear_websocket_events',
      description: 'Clear captured WebSocket event buffer.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_network_log',
      description: 'Get observed network log entries from fetch/xhr/resource timing.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          urlPattern: { type: 'string' },
          statusMin: { type: 'number' },
          statusMax: { type: 'number' },
          resourceTypes: { type: 'array', items: { type: 'string' } },
          methods: { type: 'array', items: { type: 'string' } },
          clear: { type: 'boolean' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_console_log',
      description: 'Get captured console logs (log/info/warn/error/debug).',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          levels: { type: 'array', items: { type: 'string' } },
          clear: { type: 'boolean' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.watch_dom',
      description: 'Control/read DOM mutation monitoring with MutationObserver.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['start', 'stop', 'status', 'clear'] },
          selector: { type: 'string' },
          maxEvents: { type: 'number' },
          subtree: { type: 'boolean' },
          childList: { type: 'boolean' },
          attributes: { type: 'boolean' },
          characterData: { type: 'boolean' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_performance',
      description: 'Collect Core Web Vitals, long tasks, memory, navigation timing and FPS estimate.',
      parameters: {
        type: 'object',
        properties: {
          sampleFpsMs: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_accessibility_outline',
      description: 'Collect accessible landmarks/roles/labels for current page.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_storage',
      description: 'Read localStorage/sessionStorage key-value snapshots (best effort).',
      parameters: {
        type: 'object',
        properties: { maxItems: { type: 'number' }, maxValueChars: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_cookie_map',
      description: 'Read document.cookie as a key-value map (httpOnly cookies are not available).',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_styles',
      description: 'Read computed style properties of an element.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' },
          properties: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.get_element_html',
      description: 'Read outerHTML/innerHTML/text of a specific element.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' },
          mode: { type: 'string', enum: ['outerHTML', 'innerHTML', 'text'] },
          maxChars: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.query_elements',
      description: 'Query elements by selector or fuzzy visible text.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' },
          limit: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.wait_for',
      description: 'Wait for selector/text to reach state (exists/visible/hidden).',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          text: { type: 'string' },
          state: { type: 'string', enum: ['exists', 'visible', 'hidden'] },
          timeoutMs: { type: 'number' },
          pollMs: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.keypress',
      description: 'Dispatch keyboard key or combo (e.g. Ctrl+K) on active/target element.',
      parameters: {
        type: 'object',
        properties: {
          combo: { type: 'string' },
          key: { type: 'string' },
          ctrlKey: { type: 'boolean' },
          metaKey: { type: 'boolean' },
          altKey: { type: 'boolean' },
          shiftKey: { type: 'boolean' },
          selector: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.click',
      description: 'Click an element by selector/elementId/text.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.type',
      description: 'Type text into input/textarea/contentEditable.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' },
          clear: { type: 'boolean' },
          pressEnter: { type: 'boolean' }
        },
        required: ['text'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.select',
      description: 'Select option in a <select> element by value or visible text.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          value: { type: 'string' },
          text: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.check',
      description: 'Set checkbox or radio to checked=true.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.uncheck',
      description: 'Set checkbox to checked=false.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.scroll',
      description: 'Scroll page up/down by amount or to selector.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down'] },
          amount: { type: 'number' },
          toSelector: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.extract',
      description: 'Extract text/html/attribute from a selector list.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          attr: { type: 'string' },
          limit: { type: 'number' }
        },
        required: ['selector'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'page.highlight',
      description: 'Highlight an element for visual confirmation.',
      parameters: {
        type: 'object',
        properties: {
          selector: { type: 'string' },
          elementId: { type: 'string' },
          text: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.get_tab_context',
      description: 'Get active tab metadata from Chrome API.',
      parameters: { type: 'object', properties: {}, additionalProperties: false }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.list_tabs',
      description: 'List open tabs in current window.',
      parameters: {
        type: 'object',
        properties: {
          currentWindowOnly: { type: 'boolean' },
          limit: { type: 'number' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.capture_visible',
      description: 'Capture visible area screenshot of current tab as data URL.',
      parameters: {
        type: 'object',
        properties: { quality: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.open_url',
      description: 'Open URL in new tab or active tab.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          newTab: { type: 'boolean' }
        },
        required: ['url'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.switch_tab',
      description: 'Switch to another tab by tabId.',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' } },
        required: ['tabId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.reload_tab',
      description: 'Reload active tab or target tab.',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' }, bypassCache: { type: 'boolean' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.navigate_back',
      description: 'Navigate active tab back in history.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.navigate_forward',
      description: 'Navigate active tab forward in history.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.close_tab',
      description: 'Close a target tab (or active tab by default).',
      parameters: {
        type: 'object',
        properties: { tabId: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.http_request',
      description: 'Perform extension-side HTTP request with multipart/cookie-jar/stream support. High-risk.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          method: { type: 'string' },
          headers: { type: 'object' },
          body: { type: 'string' },
          multipart: { type: 'object' },
          cookieJar: { type: 'boolean' },
          withCredentials: { type: 'boolean' },
          stream: { type: 'string', enum: ['sse', 'websocket'] },
          followRedirects: { type: 'boolean' },
          timeoutMs: { type: 'number' },
          maxChars: { type: 'number' },
          expectJson: { type: 'boolean' }
        },
        required: ['url'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.http_history_list',
      description: 'List recent HTTP request/response history entries.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.http_history_get',
      description: 'Get one HTTP history entry by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.http_history_clear',
      description: 'Clear HTTP history records.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.download',
      description: 'Download one file via Chrome downloads API.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          filename: { type: 'string' },
          saveAs: { type: 'boolean' },
          conflictAction: { type: 'string' }
        },
        required: ['url'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.download_batch',
      description: 'Batch download multiple files (e.g. images/pdf).',
      parameters: {
        type: 'object',
        properties: {
          items: { type: 'array' },
          saveAs: { type: 'boolean' }
        },
        required: ['items'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.download_status',
      description: 'Check download status by id.',
      parameters: {
        type: 'object',
        properties: { downloadId: { type: 'number' } },
        required: ['downloadId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.download_cancel',
      description: 'Cancel an in-flight download.',
      parameters: {
        type: 'object',
        properties: { downloadId: { type: 'number' } },
        required: ['downloadId'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.get_cookies',
      description: 'Get cookies using chrome.cookies API (includes httpOnly).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          domain: { type: 'string' },
          name: { type: 'string' },
          storeId: { type: 'string' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.set_cookie',
      description: 'Set cookie using chrome.cookies API.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          name: { type: 'string' },
          value: { type: 'string' },
          domain: { type: 'string' },
          path: { type: 'string' },
          secure: { type: 'boolean' },
          httpOnly: { type: 'boolean' },
          sameSite: { type: 'string' },
          expirationDate: { type: 'number' },
          storeId: { type: 'string' }
        },
        required: ['url', 'name'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.delete_cookie',
      description: 'Delete cookie using chrome.cookies API.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          name: { type: 'string' },
          storeId: { type: 'string' }
        },
        required: ['url', 'name'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.dnr_set_rules',
      description: 'Set dynamic declarativeNetRequest rules (block/redirect/headers). High-risk.',
      parameters: {
        type: 'object',
        properties: {
          rules: { type: 'array' }
        },
        required: ['rules'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.dnr_list_rules',
      description: 'List dynamic declarativeNetRequest rules.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.dnr_clear_rules',
      description: 'Clear managed dynamic declarativeNetRequest rules.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.watcher_create',
      description: 'Create an active watcher trigger with condition/action/interval.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tabId: { type: 'number' },
          urlPattern: { type: 'string' },
          intervalSec: { type: 'number' },
          condition: { type: 'object' },
          action: { type: 'object' }
        },
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.watcher_list',
      description: 'List all watchers and recent trigger state.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.watcher_pause',
      description: 'Pause a watcher by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.watcher_resume',
      description: 'Resume a paused watcher by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser.watcher_remove',
      description: 'Delete watcher by id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false
      }
    }
  }
];
