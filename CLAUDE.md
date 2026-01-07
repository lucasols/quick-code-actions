# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quick Code Actions is a VS Code extension providing JavaScript/TypeScript code refactoring tools: extracting selected code to new files with automatic import/export management, and copying file references with line annotations.

## Commands

```bash
pnpm lint          # TypeScript compilation + ESLint
pnpm test          # Run tests once (Vitest)
pnpm test:watch    # Watch mode testing
pnpm dev           # Watch mode development build
pnpm build         # Full build: lint → test → create .vsix
pnpm build:no-test # Build without running tests
pnpm install-extension  # Install built extension in Cursor
```

To debug the extension: use VS Code's debug launcher (F5) which runs the extension in extensionHost mode.

## Architecture

### Plugin System

The extension uses a pluggable refactoring architecture defined in `src/refactorings/types.ts`:

```typescript
interface Refactoring {
  id: string
  title: string
  kind: vscode.CodeActionKind
  canApply(context: RefactoringContext): boolean
  createAction(context: RefactoringContext): vscode.CodeAction
  execute(context: RefactoringContext): Promise<void>
}
```

Each refactoring is a self-contained object (not a class). The `QuickCodeActionsProvider` in `main.ts` registers all refactorings and provides them to VS Code's code action system.

### File Structure

- `src/main.ts` - Extension activation and code action provider
- `src/refactorings/` - Individual refactoring implementations (extract-to-file, copy-reference)
- `src/utils/` - Shared utilities for file operations and import/export generation
- `src/test/setup.ts` - Vitest setup with vscode mock

### Testing Patterns

Tests use `jest-mock-vscode` to mock the VS Code API. Common test helpers:
- `createMockDocument()` - Creates mock TextDocument instances
- `createContext()` - Creates RefactoringContext for testing

Mock VS Code operations with `vi.spyOn()` on the vscode namespace for input boxes, workspace edits, etc.

## Code Conventions

- Strict TypeScript: no `any`, no non-null assertions, no unsafe casts (except `as const`)
- Functional objects for refactorings, not classes
- All file paths handled with `path.resolve()` and `path.relative()` for cross-platform compatibility
- Smart detection of existing exports to avoid double-wrapping
- All async operations must handle user cancellation gracefully
