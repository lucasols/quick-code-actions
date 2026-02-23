import { getTs } from './get-ts'

export async function extractDeclarationNames(code: string): Promise<string[]> {
  const ts = await getTs()

  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  )

  const names: string[] = []

  function visit(node: import('typescript').Node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      names.push(node.name.text)
    } else if (ts.isClassDeclaration(node) && node.name) {
      names.push(node.name.text)
    } else if (ts.isInterfaceDeclaration(node)) {
      names.push(node.name.text)
    } else if (ts.isTypeAliasDeclaration(node)) {
      names.push(node.name.text)
    } else if (ts.isEnumDeclaration(node)) {
      names.push(node.name.text)
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.push(declaration.name.text)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return names
}

export async function findReferencedNames(
  code: string,
  namesToFind: string[],
): Promise<string[]> {
  if (namesToFind.length === 0) return []

  const ts = await getTs()

  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true,
  )

  const nameSet = new Set(namesToFind)
  const foundNames = new Set<string>()

  function visit(node: import('typescript').Node) {
    if (ts.isIdentifier(node) && nameSet.has(node.text)) {
      const parent = node.parent

      const isDeclaration =
        (ts.isVariableDeclaration(parent) && parent.name === node) ||
        (ts.isFunctionDeclaration(parent) && parent.name === node) ||
        (ts.isClassDeclaration(parent) && parent.name === node) ||
        (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
        (ts.isTypeAliasDeclaration(parent) && parent.name === node) ||
        (ts.isEnumDeclaration(parent) && parent.name === node) ||
        (ts.isParameter(parent) && parent.name === node) ||
        (ts.isPropertyDeclaration(parent) && parent.name === node) ||
        (ts.isMethodDeclaration(parent) && parent.name === node)

      if (!isDeclaration) {
        foundNames.add(node.text)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...foundNames]
}
