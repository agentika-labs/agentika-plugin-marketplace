import { Data } from "effect";

/**
 * Tagged error types for precise error handling.
 * Each error type preserves the original cause for debugging.
 */

// File system errors
export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly path: string;
  readonly cause?: unknown;
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class JsonParseError extends Data.TaggedError("JsonParseError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class YamlParseError extends Data.TaggedError("YamlParseError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class DirectoryReadError extends Data.TaggedError("DirectoryReadError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

// Validation errors
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly path: string;
  readonly message: string;
}> {}

// Aggregate error for multiple validation failures
export class ValidationErrors extends Data.TaggedError("ValidationErrors")<{
  readonly errors: readonly ValidationError[];
}> {}

// Safety check errors
export class SafetyCheckError extends Data.TaggedError("SafetyCheckError")<{
  readonly message: string;
}> {}
