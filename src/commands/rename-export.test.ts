import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as vscode from 'vscode'

describe('rename-export', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should show error when no active editor', async () => {
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(undefined)
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).toHaveBeenCalledWith('No active editor')
  })

  it('should show error for unsupported language', async () => {
    const mockEditor = {
      document: {
        languageId: 'python',
        getText: vi.fn().mockReturnValue(''),
        uri: { fsPath: '/src/test.py' },
      },
      selection: { active: { line: 0, character: 0 } },
    }
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(
      mockEditor as unknown as vscode.TextEditor,
    )
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).toHaveBeenCalledWith('Unsupported file type')
  })

  it('should show error when no exports found', async () => {
    const mockEditor = {
      document: {
        languageId: 'typescript',
        getText: vi.fn().mockReturnValue('const x = 1'),
        uri: { fsPath: '/src/test.ts' },
        offsetAt: vi.fn().mockReturnValue(0),
      },
      selection: { active: { line: 0, character: 0 } },
    }
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(
      mockEditor as unknown as vscode.TextEditor,
    )
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).toHaveBeenCalledWith('No exports found in this file')
  })

  it('should do nothing when user cancels input', async () => {
    const mockEditor = {
      document: {
        languageId: 'typescript',
        getText: vi.fn().mockReturnValue('export function myFunc() {}'),
        uri: { fsPath: '/src/my-func.ts' },
        offsetAt: vi.fn().mockReturnValue(0),
      },
      selection: { active: { line: 0, character: 0 } },
    }
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(
      mockEditor as unknown as vscode.TextEditor,
    )
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined)
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).not.toHaveBeenCalled()
  })

  it('should do nothing when user enters same name', async () => {
    const mockEditor = {
      document: {
        languageId: 'typescript',
        getText: vi.fn().mockReturnValue('export function myFunc() {}'),
        uri: { fsPath: '/src/my-func.ts' },
        offsetAt: vi.fn().mockReturnValue(0),
      },
      selection: { active: { line: 0, character: 0 } },
    }
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(
      mockEditor as unknown as vscode.TextEditor,
    )
    vi.spyOn(vscode.window, 'showInputBox').mockResolvedValue('myFunc')
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).not.toHaveBeenCalled()
  })

  it('should show error when main export cannot be determined', async () => {
    const code = `export function funcA() {}\nexport function funcB() {}`
    const mockEditor = {
      document: {
        languageId: 'typescript',
        getText: vi.fn().mockReturnValue(code),
        uri: { fsPath: '/src/test.ts' },
        offsetAt: vi.fn().mockReturnValue(999),
      },
      selection: { active: { line: 0, character: 0 } },
    }
    vi.spyOn(vscode.window, 'activeTextEditor', 'get').mockReturnValue(
      mockEditor as unknown as vscode.TextEditor,
    )
    const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage')

    const { renameExportCommand } = await import('./rename-export')
    await renameExportCommand()

    expect(showErrorMessage).toHaveBeenCalledWith(
      'Could not determine main export. Place your cursor on an exported declaration.',
    )
  })
})
