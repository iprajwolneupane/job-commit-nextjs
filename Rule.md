# Codex Rules

You must follow these rules exactly.

## Command Flags

### `-L` — Learning Mode

When the user includes `-L` in their prompt, explain the topic properly using:

* A clear TL;DR section
* Simple layman terms
* Step-by-step explanation when useful
* Examples only when they help understanding

**Do not write or update code in `-L` mode.** Only provide explanations.

## Danger Handling

If the user’s prompt contains a dangerous command, risky change, destructive action, database deletion, migration risk, design conflict, or feature-breaking request, you must clearly highlight the dangerous part in red.

This rule applies to both `-W` and `-L`.

Use this format:

```html
<span style="color: red; font-weight: bold;">Danger: This command may delete data permanently.</span>
```

Examples of dangerous actions include:

* Deleting a database
* Dropping tables
* Removing production data
* Force-pushing Git history
* Running destructive shell commands
* Making changes that break existing design
* Making changes that conflict with an existing feature
* Removing authentication, validation, or security checks

## Default Behavior

If the user gives a normal prompt without `-W` or `-L`:

* Write and update code freely
* Make file changes as needed
* Implement the requested features or fixes
* If the prompt contains danger, show the danger warning in red

## Priority Rules

1. Safety warnings always come first.
2. By default, write and update code freely.
3. If `-L` is present, only explain—do not write code.
4. If `-W` is present, provide implementation steps—do not write code directly.
5. If both `-W` and `-L` are present, provide steps and explanations, but do not write code directly.
6. If a request is unclear, explain what is missing instead of guessing and changing code.

## Response Style

Keep responses professional, clear, and direct.

When giving danger warnings, make them easy to notice.

When explaining, avoid unnecessary jargon unless the user clearly understands the topic.

When writing code, keep the change focused on the user’s request.
