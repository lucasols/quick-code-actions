import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { findTsConfig, parseTsConfig, getBestImportPath } from './tsconfig-utils'
import type { TsConfig } from './tsconfig-utils'
import { findFilesImporting, parseImports, resolveImportPath } from './import-finder'

export interface RenameFileResult {
  success: boolean
  updatedImportCount: number
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

async function updateImportsInRenamedFile(
  edit: vscode.WorkspaceEdit,
  sourceUri: vscode.Uri,
  sourcePath: string,
  newPath: string,
  tsConfig: TsConfig | undefined,
): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(sourceUri)
    const content = document.getText()
    const imports = parseImports(content)

    for (const imp of imports) {
      if (!imp.importPath.startsWith('.')) {
        continue
      }

      const resolvedPath = resolveImportPath(sourcePath, imp.importPath, tsConfig)
      if (!resolvedPath) {
        continue
      }

      const extensions = ['.ts', '.tsx', '.js', '.jsx', '']
      let actualPath: string | undefined

      for (const ext of extensions) {
        const testPath = resolvedPath + ext
        if (await fileExists(testPath)) {
          actualPath = testPath
          break
        }

        const indexPath = path.join(resolvedPath, `index${ext || '.ts'}`)
        if (await fileExists(indexPath)) {
          actualPath = indexPath
          break
        }
      }

      if (!actualPath) {
        continue
      }

      const newImportPath = getBestImportPath(tsConfig, newPath, actualPath)

      if (newImportPath !== imp.importPath) {
        const startPos = document.positionAt(imp.start)
        const endPos = document.positionAt(imp.end)
        const range = new vscode.Range(startPos, endPos)

        edit.replace(vscode.Uri.file(newPath), range, newImportPath)
      }
    }
  } catch {
    // If we can't update imports in the renamed file, continue anyway
  }
}

export async function renameFileWithImportUpdates(
  sourcePath: string,
  newPath: string,
): Promise<RenameFileResult> {
  const sourceUri = vscode.Uri.file(sourcePath)
  const newUri = vscode.Uri.file(newPath)

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri)
  if (!workspaceFolder) {
    return { success: false, updatedImportCount: 0 }
  }

  const workspaceRoot = workspaceFolder.uri.fsPath
  const tsConfigPath = findTsConfig(workspaceRoot)
  const tsConfig = tsConfigPath ? parseTsConfig(tsConfigPath) : undefined

  const filesWithImports = await findFilesImporting(sourcePath, tsConfig)

  const edit = new vscode.WorkspaceEdit()

  edit.renameFile(sourceUri, newUri, { overwrite: true })

  let updatedImportCount = 0

  for (const fileWithImports of filesWithImports) {
    const importingFileUri = vscode.Uri.file(fileWithImports.filePath)

    for (const imp of fileWithImports.imports) {
      const newImportPath = getBestImportPath(
        tsConfig,
        fileWithImports.filePath,
        newPath,
      )

      const document = await vscode.workspace.openTextDocument(importingFileUri)
      const startPos = document.positionAt(imp.start)
      const endPos = document.positionAt(imp.end)
      const range = new vscode.Range(startPos, endPos)

      edit.replace(importingFileUri, range, newImportPath)
      updatedImportCount++
    }
  }

  await updateImportsInRenamedFile(edit, sourceUri, sourcePath, newPath, tsConfig)

  const success = await vscode.workspace.applyEdit(edit)

  return { success, updatedImportCount }
}
