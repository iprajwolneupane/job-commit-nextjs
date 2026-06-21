
# AGENTS.md

## Project Agent Instructions

These instructions apply to AI agents working in this repository.

---

## Critical Next.js Notice

# This is NOT the Next.js you know

This project uses a version of Next.js with breaking changes.

APIs, conventions, routing behavior, and file structure may differ from your training data.

Before writing or updating any code:

1. Read the relevant guide in:

```txt
node_modules/next/dist/docs/
```

2. Check for deprecation notices.
3. Do not assume standard Next.js behavior unless it is confirmed in the local documentation.
4. Prefer the project’s existing conventions over general framework knowledge.

---

## Required Project References

Before making decisions, read and follow these files:

### `Design.md`

Use this file to understand:

* Design system
* UI patterns
* Layout rules
* Component styling
* Visual consistency requirements

### `Rule.md`

Use this file to understand:

* Prompt rules
* When code can or cannot be written
* Danger-warning behavior
* Project structure rules
* Response behavior for `-W` and `-L` flags

---

## Prompt Rule Enforcement

Always follow the rules defined in `Rule.md`.

Important summary:

* Only write or update code when the user includes `-W`.
* Explain in simple terms with TL;DR when the user includes `-L`.
* If both `-W` and `-L` are present, write/update code and explain clearly.
* If no `-W` is present, do not write or modify code.
* If a command or change is dangerous, destructive, database-related, design-breaking, or feature-breaking, show the warning in red.

Example danger format:

```html
<span style="color: red; font-weight: bold;">Danger: This action may delete data permanently.</span>
```

---

## MCP Tool Usage Policy

MCP tools are available, but use them only when necessary.

Do not use MCP tools automatically. Use them only when they directly help complete the user’s request.

Before using any MCP tool:

1. Confirm the tool is relevant to the task.
2. Avoid unnecessary external calls.
3. Do not perform destructive actions unless explicitly requested and allowed by `Rule.md`.
4. Respect project safety, design, and code-writing rules.

---

## Available MCP Tools

### `clerk`

Authentication: Unsupported
URL:

```txt
https://mcp.clerk.com/mcp
```

Available tools:

* `clerk_sdk_snippet`
* `list_clerk_sdk_snippets`

Use for Clerk-related SDK snippets or Clerk integration guidance only.

---

### `codex_apps`

Authentication: Bearer token

Available tools:

* `gmail_apply_labels_to_emails`
* `gmail_archive_emails`
* `gmail_batch_modify_email`
* `gmail_batch_read_email`
* `gmail_batch_read_email_threads`
* `gmail_bulk_label_matching_emails`
* `gmail_create_draft`
* `gmail_create_label`
* `gmail_delete_emails`
* `gmail_forward_emails`
* `gmail_get_profile`
* `gmail_list_drafts`
* `gmail_list_labels`
* `gmail_read_attachment`
* `gmail_read_email`
* `gmail_read_email_thread`
* `gmail_search_email_ids`
* `gmail_search_emails`
* `gmail_send_draft`
* `gmail_send_email`
* `gmail_update_draft`
* `yango_show-taxi-summary`

Use only when the user specifically asks for Gmail, email, labels, drafts, sending, forwarding, archiving, deleting emails, or Yango taxi-related tasks.

Do not send, delete, archive, or modify emails unless the user explicitly requests it.

---

### `gsap-master`

Authentication: Unsupported
Command:

```bash
npx -y bruzethegreat-gsap-master-mcp-server@latest
```

Available tools:

* `create_production_pattern`
* `debug_animation_issue`
* `generate_complete_setup`
* `get_gsap_api_expert`
* `optimize_for_performance`
* `understand_and_create_animation`

Use for GSAP animation setup, debugging, optimization, and production animation patterns.

Follow `Design.md` before creating or changing animations.

---

### `node_repl`

Authentication: Unsupported
Command:

```txt
C:\Users\NITRO\AppData\Local\OpenAI\Codex\bin\34ab3e1324cc55b5\node_repl.exe
```

Environment variables:

```txt
BROWSER_USE_AVAILABLE_BACKENDS=*****
BROWSER_USE_CODEX_APP_BUILD_FLAVOR=*****
CODEX_CLI_PATH=*****
CODEX_HOME=*****
NODE_REPL_INSTRUCTIONS_USE_CASE_BROWSER=*****
NODE_REPL_NATIVE_PIPE_CONNECT_TIMEOUT_MS=*****
NODE_REPL_NODE_MODULE_DIRS=*****
NODE_REPL_NODE_PATH=*****
NODE_REPL_TRUSTED_BROWSER_CLIENT_SHA256S=*****
NODE_REPL_TRUSTED_CODE_PATHS=*****
```

Available tools:

* `js`
* `js_add_node_module_dir`
* `js_reset`

Use for JavaScript or Node.js inspection, testing, and debugging when it helps validate a solution.

Do not use it to make project changes unless `-W` is present.

---

### `playwright`

Authentication: Unsupported
Command:

```bash
npx @playwright/mcp@latest
```

Available tools:

* `browser_click`
* `browser_close`
* `browser_console_messages`
* `browser_drag`
* `browser_drop`
* `browser_evaluate`
* `browser_file_upload`
* `browser_fill_form`
* `browser_handle_dialog`
* `browser_hover`
* `browser_navigate`
* `browser_navigate_back`
* `browser_network_request`
* `browser_network_requests`
* `browser_press_key`
* `browser_resize`
* `browser_run_code_unsafe`
* `browser_select_option`
* `browser_snapshot`
* `browser_tabs`
* `browser_take_screenshot`
* `browser_type`
* `browser_wait_for`

Use for browser testing, UI validation, screenshots, interaction testing, and debugging frontend behavior.

Be careful with:

```html
<span style="color: red; font-weight: bold;">Danger: browser_run_code_unsafe can execute unsafe code. Use it only when necessary and never for destructive actions.</span>
```

---

### `shadcn`

Authentication: Unsupported
Command:

```bash
npx shadcn@latest mcp
```

Available tools:

* `get_add_command_for_items`
* `get_audit_checklist`
* `get_item_examples_from_registries`
* `get_project_registries`
* `list_items_in_registries`
* `search_items_in_registries`
* `view_items_in_registries`

Use for shadcn/ui registry lookup, component examples, add commands, and audit checklists.

Before adding or changing UI components:

1. Check `Design.md`.
2. Match existing project styling.
3. Do not introduce conflicting design patterns.
4. Only write or update code when `-W` is present.

---

## Final Agent Behavior

When working in this project:

* Read local documentation before assuming framework behavior.
* Follow `Rule.md` for prompt handling.
* Follow `Design.md` for UI and design decisions.
* Use MCP tools only when necessary.
* Do not write or update code unless the user includes `-W`.
* Warn clearly in red before dangerous or destructive actions.
* Keep changes focused, safe, and consistent with the existing project.
