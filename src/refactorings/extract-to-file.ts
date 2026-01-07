import * as vscode from 'vscode'
import * as path from 'path'
import type { Refactoring, RefactoringContext, SupportedLanguageId } from './types'
import { isSupportedLanguage, CODE_ACTION_PREFIX } from './types'
import {
  suggestFileName,
  resolveTargetPath,
  getRelativeImportPath,
} from '../utils/file-utils'
import {
  generateExportStatement,
  generateImportStatement,
} from '../utils/import-utils'
import {
  extractDeclarationNames,
  findReferencedNames,
} from '../utils/ast-utils'

export const extractToFileRefactoring: Refactoring = {
  id: 'extractToFile',
  title: `${CODE_ACTION_PREFIX} Improved move to file`,
  kind: vscode.CodeActionKind.RefactorMove,

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

    const declaredNames = extractDeclarationNames(selectedText)
    const newFileContent = generateExportStatement(selectedText)

    const encoder = new TextEncoder()
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(targetPath),
      encoder.encode(newFileContent),
    )

    const edit = new vscode.WorkspaceEdit()

    const documentText = document.getText()
    const remainingCode = documentText.replace(selectedText, '')
    const referencedNames = findReferencedNames(remainingCode, declaredNames)

    if (referencedNames.length > 0) {
      const importPath = getRelativeImportPath(currentFilePath, targetPath)
      const importStatement = generateImportStatement(
        importPath,
        referencedNames,
      )
      edit.replace(document.uri, range, importStatement)
    } else {
      edit.delete(document.uri, range)
    }

    await vscode.workspace.applyEdit(edit)

    const newDocument = await vscode.workspace.openTextDocument(targetPath)
    await vscode.window.showTextDocument(newDocument, { preview: false })
  },
}
