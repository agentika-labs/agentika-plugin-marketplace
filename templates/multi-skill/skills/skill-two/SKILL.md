---
name: skill-two
description: |
  Use this skill when the user asks to "do action two",
  "perform the second operation", or mentions keywords
  related to the second skill.
version: 0.1.0
---

# Skill Two

Description of what skill two does.

## Quick Start

```typescript
// Minimal working example for skill two
const result = await performActionTwo();
console.log(result);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVICE_API_KEY` | Yes | Shared API key for the service |

## Usage

```typescript
import { Service } from "my-service";

const service = new Service(process.env.SERVICE_API_KEY);

const result = await service.actionTwo({
  param: "value",
});
```

## Related Skills

- [skill-one](../skill-one/SKILL.md) - Complementary skill for action one
