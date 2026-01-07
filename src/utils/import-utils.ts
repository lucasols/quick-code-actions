export function generateImportStatement(
  importPath: string,
  exportName: string | undefined,
): string {
  if (!exportName) {
    return `import '${importPath}'`
  }

  return `import { ${exportName} } from '${importPath}'`
}

export function generateExportWrapper(
  code: string,
  exportName: string | undefined,
): string {
  const trimmedCode = code.trim()

  if (trimmedCode.startsWith('export ')) {
    return `${trimmedCode}\n`
  }

  const declarationPatterns = [
    /^(async\s+)?function\s+\w+/,
    /^class\s+\w+/,
    /^const\s+\w+\s*=/,
    /^let\s+\w+\s*=/,
    /^interface\s+\w+/,
    /^type\s+\w+\s*=/,
  ]

  for (const pattern of declarationPatterns) {
    if (pattern.test(trimmedCode)) {
      return `export ${trimmedCode}\n`
    }
  }

  if (exportName) {
    return `export const ${exportName} = ${trimmedCode}\n`
  }

  return `${trimmedCode}\n`
}
