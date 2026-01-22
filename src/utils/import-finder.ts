import * as vscode from 'vscode'
import * as path from 'path'
import * as ts from 'typescript'
import type { TsConfig } from './tsconfig-utils'
import { resolveAliasToPath, getAliasForPath } from './tsconfig-utils'

export interface ImportInfo {
  importPath: string
  start: number
  end: number
}

export function parseImports(content: string): ImportInfo[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const imports: ImportInfo[] = []

  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node)) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          importPath: node.moduleSpecifier.text,
          start: node.moduleSpecifier.getStart(sourceFile) + 1,
          end: node.moduleSpecifier.getEnd() - 1,
        })
      }
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          importPath: node.moduleSpecifier.text,
          start: node.moduleSpecifier.getStart(sourceFile) + 1,
          end: node.moduleSpecifier.getEnd() - 1,
        })
      }
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const arg = node.arguments[0]
      if (arg && ts.isStringLiteral(arg)) {
        imports.push({
          importPath: arg.text,
          start: arg.getStart(sourceFile) + 1,
          end: arg.getEnd() - 1,
        })
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require'
    ) {
      const arg = node.arguments[0]
      if (arg && ts.isStringLiteral(arg)) {
        imports.push({
          importPath: arg.text,
          start: arg.getStart(sourceFile) + 1,
          end: arg.getEnd() - 1,
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports
}

function normalizePathForComparison(filePath: string): string {
  return filePath.replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '')
}

export function resolveImportPath(
  importingFile: string,
  importPath: string,
  config: TsConfig | undefined,
): string | undefined {
  if (importPath.startsWith('.')) {
    const importingDir = path.dirname(importingFile)
    return path.resolve(importingDir, importPath)
  }

  if (config) {
    const resolved = resolveAliasToPath(config, importPath)
    if (resolved) {
      return resolved
    }
  }

  return undefined
}

export interface FileWithImports {
  filePath: string
  imports: ImportInfo[]
}

export async function findFilesImporting(
  targetPath: string,
  config: TsConfig | undefined,
): Promise<FileWithImports[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) {
    return []
  }

  const files = await vscode.workspace.findFiles(
    '**/*.{ts,tsx,js,jsx}',
    '**/node_modules/**',
  )

  const results: FileWithImports[] = []
  const normalizedTarget = normalizePathForComparison(targetPath)

  const targetAlias = config ? getAliasForPath(config, targetPath) : undefined

  for (const file of files) {
    if (file.fsPath === targetPath) {
      continue
    }

    try {
      const document = await vscode.workspace.openTextDocument(file)
      const content = document.getText()
      const imports = parseImports(content)

      const matchingImports = imports.filter((imp) => {
        if (targetAlias && imp.importPath === targetAlias) {
          return true
        }

        const resolved = resolveImportPath(file.fsPath, imp.importPath, config)
        if (!resolved) {
          return false
        }

        const normalizedResolved = normalizePathForComparison(resolved)

        if (normalizedResolved === normalizedTarget) {
          return true
        }

        if (normalizedTarget.endsWith('/index')) {
          const dirPath = normalizedTarget.slice(0, -6)
          if (normalizedResolved === dirPath) {
            return true
          }
        }

        return false
      })

      if (matchingImports.length > 0) {
        results.push({
          filePath: file.fsPath,
          imports: matchingImports,
        })
      }
    } catch {
      continue
    }
  }

  return results
}
