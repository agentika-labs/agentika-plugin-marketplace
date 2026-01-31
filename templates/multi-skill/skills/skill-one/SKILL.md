---
name: skill-one
description: |
  Use this skill when the user asks to "do action one",
  "perform the first operation", or mentions keywords
  related to the first skill.
version: 0.1.0
---

# Skill One

Description of what skill one does.

## Quick Start

```typescript
// Minimal working example for skill one
const result = await performActionOne();
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

const result = await service.actionOne({
  param: "value",
});
```

## Related Skills

- [skill-two](../skill-two/SKILL.md) - Complementary skill for action two
