import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { isSupportedLanguage } from '../refactorings/types'
import { extractExports, resolveMainExport } from '../utils/export-utils'
import { getExtensionForLanguage } from '../utils/file-utils'
import { renameFileWithImportUpdates } from '../utils/rename-file-utils'

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

export async function syncFileNameCommand(): Promise<void> {
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

  const extension = getExtensionForLanguage(languageId)
  const newFileName = `${mainExport.name}${extension}`
  const currentPath = document.uri.fsPath
  const currentDir = path.dirname(currentPath)
  const currentFileName = path.basename(currentPath)

  if (currentFileName === newFileName) {
    vscode.window.showInformationMessage('File name already matches the export name')
    return
  }

  const newPath = path.join(currentDir, newFileName)

  if (await fileExists(newPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `File "${newFileName}" already exists. Overwrite?`,
      { modal: true },
      'Overwrite',
    )

    if (overwrite !== 'Overwrite') {
      return
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Renaming to ${newFileName}...`,
      cancellable: false,
    },
    async () => {
      const result = await renameFileWithImportUpdates(currentPath, newPath)

      if (result.success) {
        const message =
          result.updatedImportCount > 0
            ? `Renamed to ${newFileName} and updated ${result.updatedImportCount} import${result.updatedImportCount === 1 ? '' : 's'}`
            : `Renamed to ${newFileName}`

        vscode.window.showInformationMessage(message)

        const newDocument = await vscode.workspace.openTextDocument(
          vscode.Uri.file(newPath),
        )
        await vscode.window.showTextDocument(newDocument)
      } else {
        vscode.window.showErrorMessage('Failed to rename file')
      }
    },
  )
}
