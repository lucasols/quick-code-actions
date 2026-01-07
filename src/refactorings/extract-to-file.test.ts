import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'
import { extractToFileRefactoring } from './extract-to-file'
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
  languageId: string,
  selectedText: string,
): RefactoringContext {
  const document = createMockDocument(filePath, languageId, selectedText)
  const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(10, 0))
  return { document, range, selectedText }
}

describe('extractToFileRefactoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  describe('canApply', () => {
    it('should return true for typescript files with selection', () => {
      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      expect(extractToFileRefactoring.canApply(context)).toBe(true)
    })

    it('should return true for typescriptreact files', () => {
      const context = createContext('/src/file.tsx', 'typescriptreact', 'const x = 1')
      expect(extractToFileRefactoring.canApply(context)).toBe(true)
    })

    it('should return true for javascript files', () => {
      const context = createContext('/src/file.js', 'javascript', 'const x = 1')
      expect(extractToFileRefactoring.canApply(context)).toBe(true)
    })

    it('should return true for javascriptreact files', () => {
      const context = createContext('/src/file.jsx', 'javascriptreact', 'const x = 1')
      expect(extractToFileRefactoring.canApply(context)).toBe(true)
    })

    it('should return false for empty selection', () => {
      const context = createContext('/src/file.ts', 'typescript', '   ')
      expect(extractToFileRefactoring.canApply(context)).toBe(false)
    })

    it('should return false for unsupported languages', () => {
      const context = createContext('/src/file.py', 'python', 'def foo(): pass')
      expect(extractToFileRefactoring.canApply(context)).toBe(false)
    })

    it('should return false for css files', () => {
      const context = createContext('/src/file.css', 'css', '.class { color: red; }')
      expect(extractToFileRefactoring.canApply(context)).toBe(false)
    })
  })

  describe('createAction', () => {
    it('should create a code action with correct properties', () => {
      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      const action = extractToFileRefactoring.createAction(context)

      expect(action.title).toBe('Extract to new file')
      expect(action.kind).toBe(vscode.CodeActionKind.RefactorExtract)
      expect(action.command?.command).toBe('quickCodeActions.extractToFile')
    })
  })

  describe('execute', () => {
    beforeEach(() => {
      vi.spyOn(vscode.workspace.fs, 'stat').mockRejectedValue(new Error('File not found'))
      vi.spyOn(vscode.workspace.fs, 'writeFile').mockResolvedValue(undefined)
      vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true)
      vi.spyOn(vscode.workspace, 'openTextDocument').mockResolvedValue({} as vscode.TextDocument)
      vi.spyOn(vscode.window, 'showTextDocument').mockResolvedValue({} as vscode.TextEditor)
    })

    it('should cancel when user cancels file path input', async () => {
      vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined)

      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      await extractToFileRefactoring.execute(context)

      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled()
    })

    it('should cancel when user cancels export name input', async () => {
      vi.spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce('./new-file.ts')
        .mockResolvedValueOnce(undefined)

      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      await extractToFileRefactoring.execute(context)

      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled()
    })

    it('should ask for confirmation when file exists', async () => {
      vi.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue({} as vscode.FileStat)
      vi.spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce('./existing-file.ts')
        .mockResolvedValueOnce('ExistingFile')
      vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('No' as unknown as vscode.MessageItem)

      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      await extractToFileRefactoring.execute(context)

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'File existing-file.ts already exists. Overwrite?',
        'Yes',
        'No',
      )
      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled()
    })

    it('should proceed with overwrite when user confirms', async () => {
      vi.spyOn(vscode.workspace.fs, 'stat').mockResolvedValue({} as vscode.FileStat)
      vi.spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce('./existing-file.ts')
        .mockResolvedValueOnce('ExistingFile')
      vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Yes' as unknown as vscode.MessageItem)

      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      await extractToFileRefactoring.execute(context)

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled()
    })

    it('should create new file and replace selection', async () => {
      vi.spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce('./new-util.ts')
        .mockResolvedValueOnce('NewUtil')

      const context = createContext('/src/file.ts', 'typescript', 'const x = 1')
      await extractToFileRefactoring.execute(context)

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled()
      expect(vscode.workspace.applyEdit).toHaveBeenCalled()
      expect(vscode.workspace.openTextDocument).toHaveBeenCalled()
      expect(vscode.window.showTextDocument).toHaveBeenCalled()
    })
  })
})
