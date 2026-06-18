import * as vscode from 'vscode'
import type { Refactoring, RefactoringContext } from './types'

export const copyFullPathRefactoring: Refactoring = {
  id: 'copyFullPath',
  title: 'Copy Full Path',
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

    let reference: string

    if (range.isEmpty) {
      reference = filePath
    } else {
      const startLine = range.start.line + 1
      const endLine =
        range.end.character === 0 && range.end.line > range.start.line
          ? range.end.line
          : range.end.line + 1

      if (startLine === endLine) {
        reference = `${filePath}#L${startLine}`
      } else {
        reference = `${filePath}#L${startLine}-${endLine}`
      }
    }

    await vscode.env.clipboard.writeText(reference)
    vscode.window.setStatusBarMessage(`Copied: ${reference}`, 3000)
  },
}
