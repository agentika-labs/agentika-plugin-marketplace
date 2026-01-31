/**
 * Example: Basic usage of my-skill
 *
 * Prerequisites:
 * - Set MY_API_KEY environment variable
 *
 * Usage:
 * bun run examples/basic.ts
 */

async function main() {
  const apiKey = process.env.MY_API_KEY;
  if (!apiKey) {
    throw new Error("MY_API_KEY environment variable is required");
  }

  // Your example implementation here
  console.log("Running basic example...");

  // Example: Call your service
  // const service = new MyService(apiKey);
  // const result = await service.doSomething();
  // console.log("Result:", result);
}

main().catch(console.error);
