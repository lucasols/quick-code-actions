import * as ts from 'typescript'

export function generateImportStatement(
  importPath: string,
  names: string[],
): string {
  if (names.length === 0) {
    return `import '${importPath}'`
  }

  return `import { ${names.join(', ')} } from '${importPath}'`
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

export function generateExportStatement(code: string): string {
  const trimmedCode = code.trim()

  const sourceFile = ts.createSourceFile(
    'temp.ts',
    trimmedCode,
    ts.ScriptTarget.Latest,
    true,
  )

  let allExported = true

  for (const statement of sourceFile.statements) {
    const isDeclaration =
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isVariableStatement(statement)

    if (isDeclaration && !hasExportModifier(statement)) {
      allExported = false
      break
    }
  }

  if (allExported) {
    return `${trimmedCode}\n`
  }

  return `export ${trimmedCode}\n`
}
