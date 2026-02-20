import * as vscode from 'vscode'
import * as path from 'path'
import { isSupportedLanguage } from '../refactorings/types'
import { extractExports, resolveMainExport } from '../utils/export-utils'
import { toKebabCase, getExtensionForLanguage } from '../utils/file-utils'
import { renameFileWithImportUpdates } from '../utils/rename-file-utils'

export async function renameExportCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor')
    return
  }

  const { document } = editor
  const languageId = document.languageId

  if (!isSupportedLanguage(languageId)) {
    vscode.window.showErrorMessage('Unsupported file type')
    return
  }

  const content = document.getText()
  const exports = extractExports(content)

  if (exports.length === 0) {
    vscode.window.showErrorMessage('No exports found in this file')
    return
  }

  const cursorOffset = document.offsetAt(editor.selection.active)
  const mainExport = resolveMainExport(exports, cursorOffset)

  if (!mainExport) {
    vscode.window.showErrorMessage(
      'Could not determine main export. Place your cursor on an exported declaration.',
    )
    return
  }

  const newName = await vscode.window.showInputBox({
    prompt: 'Enter new name for the export',
    value: mainExport.name,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Name cannot be empty'
      }
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) {
        return 'Invalid identifier name'
      }
      return undefined
    },
  })

  if (!newName || newName === mainExport.name) {
    return
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Renaming export to ${newName}...`,
      cancellable: false,
    },
    async () => {
      const namePosition = document.positionAt(mainExport.nameStart)

      try {
        const renameEdit = await vscode.commands.executeCommand<
          vscode.WorkspaceEdit | undefined
        >('vscode.executeDocumentRenameProvider', document.uri, namePosition, newName)

        if (renameEdit) {
          const renameSuccess = await vscode.workspace.applyEdit(renameEdit)
          if (!renameSuccess) {
            vscode.window.showErrorMessage('Failed to rename symbol')
            return
          }
        }
      } catch {
        // Rename provider not available, continue with file rename only
      }

      await vscode.workspace.saveAll(false)

      const currentPath = document.uri.fsPath
      const extension = getExtensionForLanguage(languageId)
      const newFileName = `${toKebabCase(newName)}${extension}`
      const currentFileName = path.basename(currentPath)

      if (currentFileName === newFileName) {
        vscode.window.showInformationMessage(`Renamed export to ${newName}`)
        return
      }

      const currentDir = path.dirname(currentPath)
      const newPath = path.join(currentDir, newFileName)

      const result = await renameFileWithImportUpdates(currentPath, newPath)

      if (result.success) {
        const message =
          result.updatedImportCount > 0
            ? `Renamed to ${newName} and updated ${result.updatedImportCount} import path${result.updatedImportCount === 1 ? '' : 's'}`
            : `Renamed to ${newName}`

        vscode.window.showInformationMessage(message)

        const newDocument = await vscode.workspace.openTextDocument(
          vscode.Uri.file(newPath),
        )
        await vscode.window.showTextDocument(newDocument)
      } else {
        vscode.window.showErrorMessage(
          `Renamed export to ${newName} but failed to rename file`,
        )
      }
    },
  )
}
