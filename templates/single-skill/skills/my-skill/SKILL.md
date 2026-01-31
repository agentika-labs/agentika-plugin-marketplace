---
name: my-skill
description: |
  Use this skill when the user asks to "do X", "perform Y",
  or mentions related keywords like Z.
version: 0.1.0
---

# My Skill

Brief description of what this skill enables.

## Quick Start

```typescript
// Minimal working example
const result = await doSomething();
console.log(result);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `MY_API_KEY` | Yes | API key for the service |

## Usage

### Basic Example

```typescript
import { MyService } from "my-service";

const service = new MyService(process.env.MY_API_KEY);

const result = await service.doSomething({
  option: "value",
});

console.log(result);
```

### With Options

```typescript
const result = await service.doSomething({
  option: "value",
  advanced: true,
});
```

## Error Handling

```typescript
try {
  const result = await service.doSomething();
} catch (error) {
  if (error.code === "INVALID_KEY") {
    console.error("Check your API key");
  } else {
    throw error;
  }
}
```

## Related Files

- `examples/basic.ts` - Basic usage example
