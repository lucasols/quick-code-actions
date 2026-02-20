import * as path from 'path'
import type { SupportedLanguageId } from '../refactorings/types'
import { extractDeclarationNames } from './ast-utils'

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

export function toKebabCase(str: string): string {
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
  const names = extractDeclarationNames(selectedText)
  const firstName = names[0]

  if (firstName) {
    return `./${toKebabCase(firstName)}${extension}`
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

