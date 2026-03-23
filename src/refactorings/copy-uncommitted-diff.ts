import * as vscode from 'vscode'
import * as path from 'path'
import { exec } from 'child_process'
import type { Refactoring, RefactoringContext } from './types'

function getWorkspaceFolder(filePath: string): string | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined
  }

  for (const folder of workspaceFolders) {
    const folderPath = folder.uri.fsPath
    if (filePath.startsWith(folderPath)) {
      return folderPath
    }
  }

  return undefined
}

function execCommand(command: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error && stderr) {
        reject(new Error(stderr))
        return
      }
      resolve(stdout)
    })
  })
}

const hunkHeaderRegex = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

function filterDiffToSelection(
  diff: string,
  startLine: number,
  endLine: number,
): string {
  const lines = diff.split('\n')
  const headerLines: string[] = []
  const hunks: string[][] = []
  let currentHunk: string[] = []

  for (const line of lines) {
    if (hunkHeaderRegex.test(line)) {
      if (currentHunk.length > 0) {
        hunks.push(currentHunk)
      }
      currentHunk = [line]
    } else if (currentHunk.length > 0) {
      currentHunk.push(line)
    } else {
      headerLines.push(line)
    }
  }

  if (currentHunk.length > 0) {
    hunks.push(currentHunk)
  }

  const matchingHunks = hunks.filter((hunk) => {
    const header = hunk[0]
    const match = hunkHeaderRegex.exec(header ?? '')
    if (!match) return false

    const hunkStart = Number(match[1])
    const hunkLength = match[2] !== undefined ? Number(match[2]) : 1
    const hunkEnd = hunkStart + hunkLength - 1

    return hunkStart <= endLine && hunkEnd >= startLine
  })

  if (matchingHunks.length === 0) {
    return ''
  }

  return [...headerLines, ...matchingHunks.flat()].join('\n')
}

export const copyUncommittedDiffRefactoring: Refactoring = {
  id: 'copyUncommittedDiff',
  title: 'Copy Uncommitted Diff',
  kind: vscode.CodeActionKind.QuickFix,

  canApply(context: RefactoringContext): boolean {
    return !context.range.isEmpty
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
    const workspaceFolder = getWorkspaceFolder(filePath)

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found')
      return
    }

    const relativePath = path.relative(workspaceFolder, filePath)
    const startLine = range.start.line + 1
    const endLine = range.end.line + 1

    const [unstagedDiff, stagedDiff] = await Promise.all([
      execCommand(
        `git diff -- ${JSON.stringify(relativePath)}`,
        workspaceFolder,
      ),
      execCommand(
        `git diff --cached -- ${JSON.stringify(relativePath)}`,
        workspaceFolder,
      ),
    ])

    const fullDiff = [stagedDiff, unstagedDiff].filter(Boolean).join('\n')

    if (!fullDiff) {
      vscode.window.setStatusBarMessage('No uncommitted changes found', 3000)
      return
    }

    const filteredDiff = filterDiffToSelection(fullDiff, startLine, endLine)

    if (!filteredDiff) {
      vscode.window.setStatusBarMessage(
        'No uncommitted changes in selection',
        3000,
      )
      return
    }

    await vscode.env.clipboard.writeText(filteredDiff)
    vscode.window.setStatusBarMessage('Copied uncommitted diff', 3000)
  },
}
