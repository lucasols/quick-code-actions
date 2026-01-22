import * as vscode from 'vscode'
import * as path from 'path'
import type { Refactoring, RefactoringContext } from './types'

function getWorkspaceRelativePath(filePath: string): string {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return path.basename(filePath)
  }

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath
    if (filePath.startsWith(folderPath)) {
      return path.relative(folderPath, filePath)
    }
  }

  return path.basename(filePath)
}

export const copyReferenceRefactoring: Refactoring = {
  id: 'copyReference',
  title: 'Copy Reference',
  kind: vscode.CodeActionKind.QuickFix,

  canApply(_context: RefactoringContext): boolean {
    return true
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
    const { document, range } = context
    const filePath = document.uri.fsPath
    const relativePath = getWorkspaceRelativePath(filePath)

    let reference: string

    if (range.isEmpty) {
      reference = `@${relativePath}`
    } else {
      const startLine = range.start.line + 1
      const endLine = range.end.line + 1

      if (startLine === endLine) {
        reference = `@${relativePath}#L${startLine}`
      } else {
        reference = `@${relativePath}#L${startLine}-${endLine}`
      }
    }

    await vscode.env.clipboard.writeText(reference)
    vscode.window.setStatusBarMessage(`Copied: ${reference}`, 3000)
  },
}
