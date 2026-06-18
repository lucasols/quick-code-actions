import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { copyFullPathRefactoring } from './copy-full-path'
import type { RefactoringContext } from './types'

function createMockDocument(
  filePath: string,
  languageId: string,
  content: string,
): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(filePath),
    languageId,
    getText: (range?: vscode.Range) => {
      if (!range) return content
      return content
    },
  } as vscode.TextDocument
}

function createContext(
  filePath: string,
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number,
  selectedText = '',
): RefactoringContext {
  const document = createMockDocument(filePath, 'typescript', selectedText)
  const range = new vscode.Range(
    new vscode.Position(startLine, startChar),
    new vscode.Position(endLine, endChar),
  )
  return { document, range, selectedText }
}

describe('copyFullPathRefactoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('canApply', () => {
    it('should always return true', () => {
      const context = createContext('/Users/me/project/src/file.ts', 0, 0, 0, 0)
      expect(copyFullPathRefactoring.canApply(context)).toBe(true)
    })

    it('should return true even with empty selection', () => {
      const context = createContext('/Users/me/project/src/file.ts', 5, 0, 5, 0)
      expect(copyFullPathRefactoring.canApply(context)).toBe(true)
    })
  })

  describe('createAction', () => {
    it('should create a code action with correct properties', () => {
      const context = createContext('/Users/me/project/src/file.ts', 0, 0, 5, 0)
      const action = copyFullPathRefactoring.createAction(context)

      expect(action.title).toBe('Copy Full Path')
      expect(action.kind).toBe(vscode.CodeActionKind.QuickFix)
      expect(action.command?.command).toBe('quickCodeActions.copyFullPath')
    })
  })

  describe('execute', () => {
    it('should copy full absolute path without line numbers when no selection', async () => {
      const context = createContext('/Users/me/project/src/file.ts', 5, 0, 5, 0)

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/me/project/src/file.ts',
      )
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        'Copied: /Users/me/project/src/file.ts',
        3000,
      )
    })

    it('should copy full path with single line number when single line selected', async () => {
      const context = createContext(
        '/Users/me/project/src/file.ts',
        9,
        0,
        9,
        10,
        'const x = 1',
      )

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/me/project/src/file.ts#L10',
      )
    })

    it('should copy full path with line range when multiple lines selected', async () => {
      const context = createContext(
        '/Users/me/project/tests/document-store.test.ts',
        244,
        0,
        253,
        10,
        'selected code',
      )

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/me/project/tests/document-store.test.ts#L245-254',
      )
    })

    it('should treat selection ending at char 0 of next line as single line', async () => {
      const context = createContext(
        '/Users/me/project/src/file.ts',
        4,
        0,
        5,
        0,
        'const x = 1\n',
      )

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/me/project/src/file.ts#L5',
      )
    })

    it('should treat multi-line selection ending at char 0 of next line as excluding that line', async () => {
      const context = createContext(
        '/Users/me/project/src/file.ts',
        4,
        0,
        8,
        0,
        'selected code\n',
      )

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/Users/me/project/src/file.ts#L5-8',
      )
    })

    it('should keep the full path regardless of workspace folders', async () => {
      const context = createContext('/different/path/file.ts', 0, 0, 5, 0, 'code')

      await copyFullPathRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '/different/path/file.ts#L1-5',
      )
    })
  })
})
