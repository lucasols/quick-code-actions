import type * as vscode from 'vscode'

export interface RefactoringContext {
  document: vscode.TextDocument
  range: vscode.Range
  selectedText: string
}

export interface Refactoring {
  id: string
  title: string
  kind: vscode.CodeActionKind
  canApply(context: RefactoringContext): boolean
  createAction(context: RefactoringContext): vscode.CodeAction
  execute(context: RefactoringContext): Promise<void>
}

export type SupportedLanguageId =
  | 'javascript'
  | 'javascriptreact'
  | 'typescript'
  | 'typescriptreact'

export const SUPPORTED_LANGUAGES: SupportedLanguageId[] = [
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]

export function isSupportedLanguage(
  languageId: string,
): languageId is SupportedLanguageId {
  return (SUPPORTED_LANGUAGES as string[]).includes(languageId)
}
