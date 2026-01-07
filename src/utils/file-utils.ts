import * as path from 'path'
import type { SupportedLanguageId } from '../refactorings/types'

export function getExtensionForLanguage(languageId: SupportedLanguageId): string {
  switch (languageId) {
    case 'typescript':
      return '.ts'
    case 'typescriptreact':
      return '.tsx'
    case 'javascriptreact':
      return '.jsx'
    case 'javascript':
      return '.js'
  }
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

export function suggestFileName(
  selectedText: string,
  languageId: SupportedLanguageId,
): string {
  const extension = getExtensionForLanguage(languageId)

  const patterns = [
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
    /(?:export\s+)?class\s+(\w+)/,
    /(?:export\s+)?const\s+(\w+)\s*=/,
    /(?:export\s+)?interface\s+(\w+)/,
    /(?:export\s+)?type\s+(\w+)\s*=/,
  ]

  for (const pattern of patterns) {
    const match = selectedText.match(pattern)
    if (match?.[1]) {
      const name = toKebabCase(match[1])
      return `./${name}${extension}`
    }
  }

  return `./extracted${extension}`
}

export function resolveTargetPath(
  currentDir: string,
  inputPath: string,
  languageId: SupportedLanguageId,
): string {
  const extension = getExtensionForLanguage(languageId)

  let resolvedPath = inputPath
  if (!path.extname(inputPath)) {
    resolvedPath = `${inputPath}${extension}`
  }

  return path.resolve(currentDir, resolvedPath)
}

export function getRelativeImportPath(fromPath: string, toPath: string): string {
  const fromDir = path.dirname(fromPath)
  let relativePath = path.relative(fromDir, toPath)

  relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '')

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`
  }

  return relativePath
}

export function deriveExportName(filePath: string): string {
  const baseName = path.basename(filePath, path.extname(filePath))
  return baseName
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
