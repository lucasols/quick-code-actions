import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { findTsConfig, parseTsConfig, getBestImportPath } from '../utils/tsconfig-utils'
import type { TsConfig } from '../utils/tsconfig-utils'
import { findFilesImporting } from '../utils/import-finder'

const CUSTOM_PATH_LABEL = '$(edit) Enter custom path...'

interface FolderQuickPickItem extends vscode.QuickPickItem {
  folderPath?: string
}

async function collectFolders(workspaceRoot: string): Promise<string[]> {
  const excludePatterns = ['node_modules', 'dist', '.git', 'build', 'out', 'coverage', '.next']

  const folders: string[] = []

  async function walkDir(dir: string): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (excludePatterns.includes(entry.name)) continue
        if (entry.name.startsWith('.')) continue

        const fullPath = path.join(dir, entry.name)
        const relativePath = path.relative(workspaceRoot, fullPath)

        folders.push(relativePath)
        await walkDir(fullPath)
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await walkDir(workspaceRoot)

  folders.sort((a, b) => {
    const depthA = a.split(path.sep).length
    const depthB = b.split(path.sep).length
    if (depthA !== depthB) {
      return depthA - depthB
    }
    return a.localeCompare(b)
  })

  return folders
}

async function showFolderPicker(
  workspaceRoot: string,
  currentDir: string,
): Promise<string | undefined> {
  const folders = await collectFolders(workspaceRoot)

  const items: FolderQuickPickItem[] = [
    {
      label: CUSTOM_PATH_LABEL,
      description: 'Enter a custom destination path',
      alwaysShow: true,
    },
  ]

  const currentRelative = path.relative(workspaceRoot, currentDir)

  for (const folder of folders) {
    const isCurrent = folder === currentRelative
    items.push({
      label: `$(folder) ${folder}`,
      description: isCurrent ? '(current)' : undefined,
      folderPath: folder,
    })
  }

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select destination folder',
    matchOnDescription: true,
  })

  if (!selected) {
    return undefined
  }

  if (selected.label === CUSTOM_PATH_LABEL) {
    return showCustomPathInput(workspaceRoot)
  }

  return selected.folderPath
}

async function showCustomPathInput(workspaceRoot: string): Promise<string | undefined> {
  const input = await vscode.window.showInputBox({
    prompt: 'Enter destination path (relative to workspace root or absolute)',
    placeHolder: 'src/components',
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Path cannot be empty'
      }
      return undefined
    },
  })

  if (!input) {
    return undefined
  }

  if (path.isAbsolute(input)) {
    return path.relative(workspaceRoot, input)
  }

  return input
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath)
    return true
  } catch {
    return false
  }
}

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true })
  } catch {
    // Directory may already exist
  }
}

export async function moveFileToCommand(uri?: vscode.Uri): Promise<void> {
  let sourceUri: vscode.Uri | undefined

  if (uri) {
    sourceUri = uri
  } else {
    const editor = vscode.window.activeTextEditor
    if (editor) {
      sourceUri = editor.document.uri
    }
  }

  if (!sourceUri) {
    vscode.window.showErrorMessage('No file selected to move')
    return
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(sourceUri)
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('File must be in a workspace')
    return
  }

  const workspaceRoot = workspaceFolder.uri.fsPath
  const sourcePath = sourceUri.fsPath
  const sourceDir = path.dirname(sourcePath)
  const fileName = path.basename(sourcePath)

  const destinationFolder = await showFolderPicker(workspaceRoot, sourceDir)
  if (destinationFolder === undefined) {
    return
  }

  const destinationDir = path.resolve(workspaceRoot, destinationFolder)
  const destinationPath = path.join(destinationDir, fileName)

  if (sourcePath === destinationPath) {
    vscode.window.showInformationMessage('File is already in the selected location')
    return
  }

  if (await fileExists(destinationPath)) {
    const overwrite = await vscode.window.showWarningMessage(
      `File "${fileName}" already exists in ${destinationFolder}. Overwrite?`,
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
      title: `Moving ${fileName}...`,
      cancellable: false,
    },
    async (progress) => {
      progress.report({ message: 'Finding imports...' })

      const tsConfigPath = findTsConfig(workspaceRoot)
      const tsConfig = tsConfigPath ? parseTsConfig(tsConfigPath) : undefined

      const filesWithImports = await findFilesImporting(sourcePath, tsConfig)

      progress.report({ message: 'Creating workspace edit...' })

      const edit = new vscode.WorkspaceEdit()

      await ensureDirectoryExists(destinationDir)

      edit.renameFile(sourceUri, vscode.Uri.file(destinationPath), {
        overwrite: true,
      })

      let updatedImportCount = 0

      for (const fileWithImports of filesWithImports) {
        const importingFileUri = vscode.Uri.file(fileWithImports.filePath)

        for (const imp of fileWithImports.imports) {
          const newImportPath = getBestImportPath(
            tsConfig,
            fileWithImports.filePath,
            destinationPath,
          )

          const document = await vscode.workspace.openTextDocument(importingFileUri)
          const startPos = document.positionAt(imp.start)
          const endPos = document.positionAt(imp.end)
          const range = new vscode.Range(startPos, endPos)

          edit.replace(importingFileUri, range, newImportPath)
          updatedImportCount++
        }
      }

      await updateImportsInMovedFile(
        edit,
        sourceUri,
        sourcePath,
        destinationPath,
        tsConfig,
      )

      progress.report({ message: 'Applying changes...' })

      const success = await vscode.workspace.applyEdit(edit)

      if (success) {
        const message =
          updatedImportCount > 0
            ? `Moved ${fileName} and updated ${updatedImportCount} import${updatedImportCount === 1 ? '' : 's'}`
            : `Moved ${fileName}`

        vscode.window.showInformationMessage(message)

        const newDocument = await vscode.workspace.openTextDocument(
          vscode.Uri.file(destinationPath),
        )
        await vscode.window.showTextDocument(newDocument)
      } else {
        vscode.window.showErrorMessage('Failed to move file')
      }
    },
  )
}

async function updateImportsInMovedFile(
  edit: vscode.WorkspaceEdit,
  sourceUri: vscode.Uri,
  sourcePath: string,
  destinationPath: string,
  tsConfig: TsConfig | undefined,
): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(sourceUri)
    const content = document.getText()

    const { parseImports, resolveImportPath } = await import('../utils/import-finder')

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

      const newImportPath = getBestImportPath(tsConfig, destinationPath, actualPath)

      if (newImportPath !== imp.importPath) {
        const startPos = document.positionAt(imp.start)
        const endPos = document.positionAt(imp.end)
        const range = new vscode.Range(startPos, endPos)

        edit.replace(vscode.Uri.file(destinationPath), range, newImportPath)
      }
    }
  } catch {
    // If we can't update imports in the moved file, continue anyway
  }
}
