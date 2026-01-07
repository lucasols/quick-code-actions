import * as vscode from 'vscode'
import * as path from 'path'
import type { Refactoring, RefactoringContext, SupportedLanguageId } from './types'
import { isSupportedLanguage } from './types'
import {
  suggestFileName,
  resolveTargetPath,
  getRelativeImportPath,
  deriveExportName,
} from '../utils/file-utils'
import { generateImportStatement, generateExportWrapper } from '../utils/import-utils'

export const extractToFileRefactoring: Refactoring = {
  id: 'extractToFile',
  title: 'Extract to new file',
  kind: vscode.CodeActionKind.RefactorExtract,

  canApply(context: RefactoringContext): boolean {
    if (!context.selectedText.trim()) {
      return false
    }

    return isSupportedLanguage(context.document.languageId)
  },

  createAction(context: RefactoringContext): vscode.CodeAction {
    const action = new vscode.CodeAction(this.title, this.kind)

    action.command = {
      command: `quickCodeActions.${this.id}`,
      title: this.title,
      arguments: [context],
    }

    return action
  },

  async execute(context: RefactoringContext): Promise<void> {
    const { document, range, selectedText } = context
    const currentFilePath = document.uri.fsPath
    const currentDir = path.dirname(currentFilePath)

    if (!isSupportedLanguage(document.languageId)) {
      return
    }

    const languageId: SupportedLanguageId = document.languageId

    const suggestedName = suggestFileName(selectedText, languageId)

    const inputPath = await vscode.window.showInputBox({
      prompt: 'Enter the path for the new file (relative to current file)',
      value: suggestedName,
      validateInput: (value) => {
        if (!value.trim()) {
          return 'File path cannot be empty'
        }
        return undefined
      },
    })

    if (!inputPath) {
      return
    }

    const targetPath = resolveTargetPath(currentDir, inputPath, languageId)

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(targetPath))
      const overwrite = await vscode.window.showWarningMessage(
        `File ${path.basename(targetPath)} already exists. Overwrite?`,
        'Yes',
        'No',
      )
      if (overwrite !== 'Yes') {
        return
      }
    } catch {
      // File does not exist, proceed
    }

    const suggestedExportName = deriveExportName(inputPath)
    const exportName = await vscode.window.showInputBox({
      prompt: 'Enter the export name (leave empty for no named export wrapper)',
      value: suggestedExportName,
    })

    if (exportName === undefined) {
      return
    }

    const newFileContent = generateExportWrapper(
      selectedText,
      exportName || undefined,
    )

    const importPath = getRelativeImportPath(currentFilePath, targetPath)
    const importStatement = generateImportStatement(
      importPath,
      exportName || undefined,
    )

    const encoder = new TextEncoder()
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(targetPath),
      encoder.encode(newFileContent),
    )

    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, range, importStatement)
    await vscode.workspace.applyEdit(edit)

    const newDocument = await vscode.workspace.openTextDocument(targetPath)
    await vscode.window.showTextDocument(newDocument, { preview: false })
  },
}
