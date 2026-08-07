/**
 * Pull the `*.mdx` module declarations from `@types/mdx` into the program.
 *
 * TypeScript 7 (tsgo) does not auto-include ambient `@types` packages that
 * only contribute module declarations, so `.mdx` imports fail with TS2307
 * without this explicit reference.
 */
/// <reference types="mdx" />
