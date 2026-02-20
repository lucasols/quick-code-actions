import * as ts from 'typescript'

export interface ExportInfo {
  name: string
  isType: boolean
  nameStart: number
  nameEnd: number
  declarationStart: number
  declarationEnd: number
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false
  const modifiers = ts.getModifiers(node)
  if (!modifiers) return false
  return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
}

export function extractExports(code: string): ExportInfo[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )

  const exports: ExportInfo[] = []

  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push({
        name: node.name.text,
        isType: false,
        nameStart: node.name.getStart(sourceFile),
        nameEnd: node.name.getEnd(),
        declarationStart: node.getStart(sourceFile),
        declarationEnd: node.getEnd(),
      })
    } else if (ts.isClassDeclaration(node) && node.name && hasExportModifier(node)) {
      exports.push({
        name: node.name.text,
        isType: false,
        nameStart: node.name.getStart(sourceFile),
        nameEnd: node.name.getEnd(),
        declarationStart: node.getStart(sourceFile),
        declarationEnd: node.getEnd(),
      })
    } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          exports.push({
            name: decl.name.text,
            isType: false,
            nameStart: decl.name.getStart(sourceFile),
            nameEnd: decl.name.getEnd(),
            declarationStart: node.getStart(sourceFile),
            declarationEnd: node.getEnd(),
          })
        }
      }
    } else if (ts.isEnumDeclaration(node) && hasExportModifier(node)) {
      exports.push({
        name: node.name.text,
        isType: false,
        nameStart: node.name.getStart(sourceFile),
        nameEnd: node.name.getEnd(),
        declarationStart: node.getStart(sourceFile),
        declarationEnd: node.getEnd(),
      })
    } else if (ts.isInterfaceDeclaration(node) && hasExportModifier(node)) {
      exports.push({
        name: node.name.text,
        isType: true,
        nameStart: node.name.getStart(sourceFile),
        nameEnd: node.name.getEnd(),
        declarationStart: node.getStart(sourceFile),
        declarationEnd: node.getEnd(),
      })
    } else if (ts.isTypeAliasDeclaration(node) && hasExportModifier(node)) {
      exports.push({
        name: node.name.text,
        isType: true,
        nameStart: node.name.getStart(sourceFile),
        nameEnd: node.name.getEnd(),
        declarationStart: node.getStart(sourceFile),
        declarationEnd: node.getEnd(),
      })
    } else if (
      ts.isExportDeclaration(node) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause) &&
      !node.moduleSpecifier
    ) {
      for (const element of node.exportClause.elements) {
        exports.push({
          name: element.name.text,
          isType: node.isTypeOnly || element.isTypeOnly,
          nameStart: element.name.getStart(sourceFile),
          nameEnd: element.name.getEnd(),
          declarationStart: element.getStart(sourceFile),
          declarationEnd: element.getEnd(),
        })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return exports
}

export function resolveMainExport(
  exports: ExportInfo[],
  cursorOffset: number,
): ExportInfo | undefined {
  if (exports.length === 0) {
    return undefined
  }

  if (exports.length === 1) {
    return exports[0]
  }

  const nonTypeExports = exports.filter((e) => !e.isType)
  if (nonTypeExports.length === 1) {
    return nonTypeExports[0]
  }

  return exports.find(
    (e) => cursorOffset >= e.declarationStart && cursorOffset <= e.declarationEnd,
  )
}
