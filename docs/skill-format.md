# SKILL.md Format Specification

SKILL.md files define individual skills within a plugin. They use YAML frontmatter for metadata and Markdown for documentation.

## Structure

```markdown
---
# Required
name: skill-name
description: |
  Trigger phrases for agent discovery...
version: 0.1.0

# Optional
license: MIT
metadata:
  author: Your Name
  tags: [api, integration]
---

# Skill Title

Content in Markdown...
```

Required fields are validated by the marketplace tooling; optional fields provide additional metadata for discovery.

## Frontmatter (Required)

### name

Unique identifier for the skill within the plugin.

- **Type:** string
- **Format:** kebab-case
- **Example:** `stripe-checkout`, `create-user`, `run-tests`

```yaml
name: stripe-checkout
```

### description

Trigger phrases and keywords that help agents discover this skill. This is the most important field for discoverability.

- **Type:** string (multi-line recommended)
- **Format:** Natural language with quoted trigger phrases

```yaml
description: |
  Use this skill when the user asks to "create a Stripe checkout",
  "process payments with Stripe", "add payment integration",
  or mentions Stripe API, PaymentIntent, or checkout sessions.
```

#### Best Practices

1. **Start with action:** "Use this skill when..."
2. **Include quoted phrases:** User queries in quotes
3. **List keywords:** Technical terms that indicate relevance
4. **Be specific:** Avoid generic descriptions

```yaml
# Good
description: |
  Use this skill when the user asks to "create a Stripe checkout",
  "set up payment processing", "integrate Stripe", or mentions
  PaymentIntent, checkout sessions, or Stripe webhooks.

# Bad
description: Handles payments
```

### version

Semantic version of the skill.

- **Type:** string
- **Format:** `major.minor.patch`
- **Example:** `0.1.0`, `1.0.0`, `2.3.1`

```yaml
version: 0.1.0
```

## Frontmatter (Optional)

These fields are optional and provide additional metadata for discovery and attribution.

### license

SPDX license identifier for the skill.

- **Type:** string
- **Format:** SPDX identifier
- **Example:** `MIT`, `Apache-2.0`, `ISC`

```yaml
license: MIT
```

### metadata

Additional metadata for discovery and attribution.

- **Type:** object
- **Properties:**
  - `author` (string): Skill author name
  - `tags` (array): Searchable tags for categorization
  - Custom fields allowed

```yaml
metadata:
  author: Jane Developer
  tags: [payments, api, e-commerce]
  custom_field: any value
```

## Frontmatter (Extended)

These fields control skill execution behavior. They are used in practice (e.g., by grepika skills) but are not required.

### disable-model-invocation

Prevents the model from automatically invoking this skill. When `true`, the skill can only be triggered by explicit user request (e.g., `/skill-name`).

- **Type:** boolean
- **Default:** `false`

```yaml
disable-model-invocation: true
```

### context

Controls the execution context for the skill.

- **Type:** string
- **Values:** `"fork"` — Runs the skill in a forked subprocess

```yaml
context: fork
```

### agent

Specifies which agent type should execute this skill.

- **Type:** string
- **Example:** `"Explore"` — Delegates to the Explore agent

```yaml
agent: Explore
```

### allowed-tools

Whitelist of MCP tools the skill is allowed to use. Restricts the skill's capabilities to only the listed tools.

- **Type:** array of strings
- **Format:** MCP tool identifiers (e.g., `mcp__server__tool_name`)

```yaml
allowed-tools:
  - mcp__grepika__search
  - mcp__grepika__relevant
  - mcp__grepika__get
```

### Example with Extended Fields

```yaml
---
name: investigate
description: |
  Use this skill when the user asks to "investigate a bug",
  "trace an error", or "debug this issue".
version: 1.0.0
disable-model-invocation: true
context: fork
agent: Explore
allowed-tools:
  - mcp__grepika__search
  - mcp__grepika__relevant
  - mcp__grepika__refs
  - mcp__grepika__outline
  - mcp__grepika__get
---
```

## Agent Definitions

Plugins can also include agent definitions in an `agents/` directory. Each agent is defined as a Markdown file (e.g., `agents/explorer.md`) with YAML frontmatter containing a `name` and `description`. See [Creating Plugins](creating-plugins.md) for the plugin directory structure.

## Markdown Content

After the frontmatter, document the skill in Markdown.

### Recommended Sections

```markdown
# Skill Title

Brief description of what this skill enables.

## Quick Start

Minimal working example to get started immediately.

## Configuration

Environment variables and setup requirements.

## API Reference

Main functions, endpoints, or interfaces.

## Examples

Common usage patterns with code samples.

## Related Files

Links to examples/ and references/ directories.
```

## Complete Example

```markdown
---
name: stripe-checkout
description: |
  Use this skill when the user asks to "create a Stripe checkout",
  "process payments with Stripe", "add payment integration",
  or mentions Stripe API, PaymentIntent, or checkout sessions.
version: 0.1.0
---

# Stripe Checkout Integration

Create Stripe checkout sessions for payment processing.

## Quick Start

\`\`\`typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [{ price: "price_xxx", quantity: 1 }],
  success_url: "https://example.com/success",
  cancel_url: "https://example.com/cancel",
});

console.log(session.url);
\`\`\`

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (sk_...) |
| `STRIPE_WEBHOOK_SECRET` | For webhooks | Webhook signing secret |

## Creating a Checkout Session

### Basic Session

\`\`\`typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  line_items: [
    {
      price_data: {
        currency: "usd",
        product_data: { name: "Product Name" },
        unit_amount: 2000, // $20.00
      },
      quantity: 1,
    },
  ],
  success_url: "https://example.com/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: "https://example.com/cancel",
});
\`\`\`

### With Customer Email

\`\`\`typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  customer_email: "customer@example.com",
  line_items: [...],
  success_url: "...",
  cancel_url: "...",
});
\`\`\`

## Handling Webhooks

\`\`\`typescript
import { Hono } from "hono";

const app = new Hono();

app.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    // Fulfill the order
  }

  return c.json({ received: true });
});
\`\`\`

## Related Files

- `examples/basic-checkout.ts` - Simple checkout flow
- `examples/subscription.ts` - Subscription payments
- `references/webhook-events.md` - Webhook event types
```

## Validation Rules

The `validate.ts` script checks:

1. **Frontmatter exists** - YAML block with `---` delimiters
2. **Required fields present** - `name`, `description`, `version`
3. **Name format** - Must be kebab-case
4. **Version format** - Must be semantic version
5. **No duplicate names** - Unique within the marketplace

## Tips

### For Discoverability

- Include 3-5 trigger phrases in quotes
- Add technical keywords
- Mention alternative phrasings

### For Usefulness

- Start with a working Quick Start example
- Document all required configuration
- Show common patterns and edge cases

### For Maintenance

- Keep examples updated with dependencies
- Document breaking changes in version bumps
- Link to official documentation
