import * as vscode from 'vscode'
import type { Refactoring, RefactoringContext } from './refactorings/types'
import { SUPPORTED_LANGUAGES } from './refactorings/types'
import { extractToFileRefactoring } from './refactorings/extract-to-file'
import { copyReferenceRefactoring } from './refactorings/copy-reference'
import { moveFileToCommand } from './commands/move-file-to'

class QuickCodeActionsProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.Refactor,
    vscode.CodeActionKind.RefactorMove,
  ]

  constructor(private readonly refactorings: Refactoring[]) {}

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
  ): vscode.CodeAction[] {
    const context: RefactoringContext = {
      document,
      range,
      selectedText: document.getText(range),
    }

    const actions: vscode.CodeAction[] = []

    for (const refactoring of this.refactorings) {
      if (refactoring.canApply(context)) {
        actions.push(refactoring.createAction(context))
      }
    }

    return actions
  }
}

export function activate(context: vscode.ExtensionContext) {
  const codeActionRefactorings = [extractToFileRefactoring]
  const contextMenuCommands = [copyReferenceRefactoring]
  const allRefactorings = [...codeActionRefactorings, ...contextMenuCommands]

  const provider = new QuickCodeActionsProvider(codeActionRefactorings)

  const providerDisposable = vscode.languages.registerCodeActionsProvider(
    SUPPORTED_LANGUAGES.map((language) => ({ language })),
    provider,
    {
      providedCodeActionKinds: QuickCodeActionsProvider.providedCodeActionKinds,
    },
  )

  for (const refactoring of allRefactorings) {
    const commandDisposable = vscode.commands.registerCommand(
      `quickCodeActions.${refactoring.id}`,
      async () => {
        const editor = vscode.window.activeTextEditor
        if (!editor) return

        const refactoringContext: RefactoringContext = {
          document: editor.document,
          range: editor.selection,
          selectedText: editor.document.getText(editor.selection),
        }

        if (refactoring.canApply(refactoringContext)) {
          await refactoring.execute(refactoringContext)
        }
      },
    )
    context.subscriptions.push(commandDisposable)
  }

  context.subscriptions.push(providerDisposable)

  context.subscriptions.push(
    vscode.commands.registerCommand('quickCodeActions.moveFileTo', moveFileToCommand),
  )
}
