# Hermes Tweet

Hermes Tweet adds source-native guidance for using the
[Hermes Tweet](https://github.com/Xquik-dev/hermes-tweet) Hermes Agent plugin
from Claude Code.

Use it when an agent needs X/Twitter research, public post context, account
reads, or approval-gated publishing workflows through Hermes Agent.

## Install

```bash
claude --plugin-dir ./plugins/hermes-tweet
```

## Runtime Setup

Install and enable Hermes Tweet in the Hermes Agent runtime, then configure
`XQUIK_API_KEY` in that runtime environment. Keep account-changing actions
disabled unless a workflow has an explicit approval step.

## Safety

- Start with read-only research workflows.
- Keep private keys, cookies, signing keys, passwords, and TOTP secrets out of
  chat.
- Enable action tools only when the user has approved the exact endpoint and
  payload.
