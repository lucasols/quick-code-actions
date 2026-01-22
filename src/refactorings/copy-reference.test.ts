import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { copyReferenceRefactoring } from './copy-reference'
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

function mockWorkspaceFolders(folders: vscode.WorkspaceFolder[] | undefined) {
  vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue(folders)
}

describe('copyReferenceRefactoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkspaceFolders([
      { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
    ])
  })

  describe('canApply', () => {
    it('should always return true', () => {
      const context = createContext('/workspace/src/file.ts', 0, 0, 0, 0)
      expect(copyReferenceRefactoring.canApply(context)).toBe(true)
    })

    it('should return true even with empty selection', () => {
      const context = createContext('/workspace/src/file.ts', 5, 0, 5, 0)
      expect(copyReferenceRefactoring.canApply(context)).toBe(true)
    })
  })

  describe('createAction', () => {
    it('should create a code action with correct properties', () => {
      const context = createContext('/workspace/src/file.ts', 0, 0, 5, 0)
      const action = copyReferenceRefactoring.createAction(context)

      expect(action.title).toBe('Copy Reference')
      expect(action.kind).toBe(vscode.CodeActionKind.QuickFix)
      expect(action.command?.command).toBe('quickCodeActions.copyReference')
    })
  })

  describe('execute', () => {
    it('should copy file path without line numbers when no selection', async () => {
      const context = createContext('/workspace/src/file.ts', 5, 0, 5, 0)

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('@src/file.ts')
      expect(vscode.window.setStatusBarMessage).toHaveBeenCalledWith(
        'Copied: @src/file.ts',
        3000,
      )
    })

    it('should copy file path with single line number when single line selected', async () => {
      const context = createContext('/workspace/src/file.ts', 9, 0, 9, 10, 'const x = 1')

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('@src/file.ts#L10')
    })

    it('should copy file path with line range when multiple lines selected', async () => {
      const context = createContext(
        '/workspace/tests/document-store.test.ts',
        244,
        0,
        253,
        10,
        'selected code',
      )

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '@tests/document-store.test.ts#L245-254',
      )
    })

    it('should use basename when file is outside workspace', async () => {
      mockWorkspaceFolders([
        { uri: vscode.Uri.file('/other-workspace'), name: 'other', index: 0 },
      ])
      const context = createContext('/different/path/file.ts', 0, 0, 5, 0, 'code')

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('@file.ts#L1-6')
    })

    it('should use basename when no workspace folders', async () => {
      mockWorkspaceFolders(undefined)
      const context = createContext('/some/path/file.ts', 10, 0, 10, 5, 'code')

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('@file.ts#L11')
    })

    it('should handle deeply nested files', async () => {
      const context = createContext(
        '/workspace/src/features/auth/components/LoginForm.tsx',
        0,
        0,
        50,
        0,
        'component code',
      )

      await copyReferenceRefactoring.execute(context)

      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(
        '@src/features/auth/components/LoginForm.tsx#L1-51',
      )
    })
  })
})
