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

function buildReference(relativePath: string, range: vscode.Range): string {
  if (range.isEmpty) {
    return `@${relativePath}`
  }

  const startLine = range.start.line + 1
  const endLine =
    range.end.character === 0 && range.end.line > range.start.line
      ? range.end.line
      : range.end.line + 1

  if (startLine === endLine) {
    return `@${relativePath}#L${startLine}`
  }

  return `@${relativePath}#L${startLine}-${endLine}`
}

function findClaudeTerminal(): vscode.Terminal | undefined {
  return vscode.window.terminals.find((terminal) =>
    terminal.name.toLowerCase().includes('claude'),
  )
}

export const addToClaudeCodeRefactoring: Refactoring = {
  id: 'addToClaudeCode',
  title: 'Add to Claude Code',
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
    const reference = buildReference(relativePath, range)

    const claudeTerminal = findClaudeTerminal()

    if (!claudeTerminal) {
      await vscode.window.showErrorMessage(
        'Claude Code terminal not found. Make sure Claude Code is running.',
      )
      return
    }

    claudeTerminal.show()
    claudeTerminal.sendText(` ${reference} `, false)
  },
}
