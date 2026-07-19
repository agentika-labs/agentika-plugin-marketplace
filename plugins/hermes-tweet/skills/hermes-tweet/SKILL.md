---
name: hermes-tweet
description: |
  Use this skill when the user asks to research X/Twitter with Hermes Agent,
  gather public post context, inspect public account activity, prepare social
  listening summaries, or plan approval-gated X/Twitter actions.
version: 0.1.8
---

# Hermes Tweet

Use Hermes Tweet when the user wants Hermes Agent to work with X/Twitter
research, public post context, or explicitly approved account actions.

## Workflow

1. Use Hermes Tweet for discovery and read-only context first.
2. Summarize public X/Twitter evidence before proposing any action.
3. Treat posting, replies, likes, follows, DMs, monitors, extractions, draws,
   webhooks, and media operations as actions that require explicit user
   approval.
4. Keep action tools disabled unless the workflow has a clear approval step.

## Runtime Requirements

- Install and enable `hermes-tweet` in the Hermes Agent runtime.
- Configure `XQUIK_API_KEY` in the runtime environment.
- Set action gating deliberately before any write or private account workflow.

## Safety Rules

- Never request or reveal API keys, signing keys, cookies, passwords, or TOTP
  secrets in chat.
- Do not place credentials in tool arguments, markdown, examples, or generated
  files.
- If credentials are missing, ask the user to configure them in the Hermes Agent
  runtime environment.
- If the user asks for an account-changing action, state the exact endpoint and
  payload first, then wait for approval.
