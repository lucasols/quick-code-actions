import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { addToClaudeCodeRefactoring } from './add-to-claude-code'
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

interface MockTerminal {
  name: string
  show: ReturnType<typeof vi.fn>
  sendText: ReturnType<typeof vi.fn>
}

function mockTerminals(terminals: MockTerminal[]) {
  vi.spyOn(vscode.window, 'terminals', 'get').mockReturnValue(
    terminals as unknown as readonly vscode.Terminal[],
  )
}

describe('addToClaudeCodeRefactoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkspaceFolders([
      { uri: vscode.Uri.file('/workspace'), name: 'workspace', index: 0 },
    ])
  })

  describe('canApply', () => {
    it('should always return true', () => {
      const context = createContext('/workspace/src/file.ts', 0, 0, 0, 0)
      expect(addToClaudeCodeRefactoring.canApply(context)).toBe(true)
    })
  })

  describe('createAction', () => {
    it('should create a code action with correct properties', () => {
      const context = createContext('/workspace/src/file.ts', 0, 0, 5, 0)
      const action = addToClaudeCodeRefactoring.createAction(context)

      expect(action.title).toBe('Add to Claude Code')
      expect(action.kind).toBe(vscode.CodeActionKind.QuickFix)
      expect(action.command?.command).toBe('quickCodeActions.addToClaudeCode')
    })
  })

  describe('execute', () => {
    it('should find Claude Code terminal and send reference', async () => {
      const mockTerminal: MockTerminal = {
        name: 'Claude Code',
        show: vi.fn(),
        sendText: vi.fn(),
      }
      mockTerminals([mockTerminal])

      const context = createContext('/workspace/src/file.ts', 9, 0, 9, 10, 'const x = 1')

      await addToClaudeCodeRefactoring.execute(context)

      expect(mockTerminal.show).toHaveBeenCalled()
      expect(mockTerminal.sendText).toHaveBeenCalledWith(' @src/file.ts#L10 ', false)
    })

    it('should find terminal with case-insensitive match', async () => {
      const mockTerminal: MockTerminal = {
        name: 'claude',
        show: vi.fn(),
        sendText: vi.fn(),
      }
      mockTerminals([
        { name: 'bash', show: vi.fn(), sendText: vi.fn() },
        mockTerminal,
      ])

      const context = createContext('/workspace/src/file.ts', 0, 0, 0, 0)

      await addToClaudeCodeRefactoring.execute(context)

      expect(mockTerminal.show).toHaveBeenCalled()
      expect(mockTerminal.sendText).toHaveBeenCalledWith(' @src/file.ts ', false)
    })

    it('should show error when no Claude Code terminal found', async () => {
      mockTerminals([
        { name: 'bash', show: vi.fn(), sendText: vi.fn() },
        { name: 'node', show: vi.fn(), sendText: vi.fn() },
      ])

      const context = createContext('/workspace/src/file.ts', 0, 0, 0, 0)

      await addToClaudeCodeRefactoring.execute(context)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Claude Code terminal not found. Make sure Claude Code is running.',
      )
    })

    it('should show error when no terminals exist', async () => {
      mockTerminals([])

      const context = createContext('/workspace/src/file.ts', 0, 0, 0, 0)

      await addToClaudeCodeRefactoring.execute(context)

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Claude Code terminal not found. Make sure Claude Code is running.',
      )
    })

    it('should send file path without line numbers when no selection', async () => {
      const mockTerminal: MockTerminal = {
        name: 'Claude Code',
        show: vi.fn(),
        sendText: vi.fn(),
      }
      mockTerminals([mockTerminal])

      const context = createContext('/workspace/src/file.ts', 5, 0, 5, 0)

      await addToClaudeCodeRefactoring.execute(context)

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' @src/file.ts ', false)
    })

    it('should send file path with line range when multiple lines selected', async () => {
      const mockTerminal: MockTerminal = {
        name: 'Claude Code',
        show: vi.fn(),
        sendText: vi.fn(),
      }
      mockTerminals([mockTerminal])

      const context = createContext(
        '/workspace/tests/document-store.test.ts',
        244,
        0,
        253,
        10,
        'selected code',
      )

      await addToClaudeCodeRefactoring.execute(context)

      expect(mockTerminal.sendText).toHaveBeenCalledWith(
        ' @tests/document-store.test.ts#L245-254 ',
        false,
      )
    })

    it('should treat selection ending at char 0 of next line as single line', async () => {
      const mockTerminal: MockTerminal = {
        name: 'Claude Code',
        show: vi.fn(),
        sendText: vi.fn(),
      }
      mockTerminals([mockTerminal])

      const context = createContext('/workspace/src/file.ts', 4, 0, 5, 0, 'const x = 1\n')

      await addToClaudeCodeRefactoring.execute(context)

      expect(mockTerminal.sendText).toHaveBeenCalledWith(' @src/file.ts#L5 ', false)
    })
  })
})
