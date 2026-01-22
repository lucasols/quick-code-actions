import * as path from 'path'
import * as fs from 'fs'

interface TsConfigPaths {
  [key: string]: string[]
}

export interface TsConfig {
  baseUrl?: string
  paths?: TsConfigPaths
  configDir: string
}

export function findTsConfig(workspaceRoot: string): string | undefined {
  const candidates = ['tsconfig.json', 'jsconfig.json']

  for (const candidate of candidates) {
    const configPath = path.join(workspaceRoot, candidate)
    if (fs.existsSync(configPath)) {
      return configPath
    }
  }

  return undefined
}

function parseJsonWithComments(content: string): unknown {
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/,(\s*[}\]])/g, '$1')

  return JSON.parse(withoutComments)
}

export function parseTsConfig(configPath: string): TsConfig | undefined {
  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    const parsed = parseJsonWithComments(content) as {
      extends?: string
      compilerOptions?: {
        baseUrl?: string
        paths?: TsConfigPaths
      }
    }

    const configDir = path.dirname(configPath)
    let baseConfig: TsConfig | undefined

    if (parsed.extends) {
      const extendsPath = path.resolve(configDir, parsed.extends)
      const resolvedExtendsPath = extendsPath.endsWith('.json')
        ? extendsPath
        : `${extendsPath}.json`

      if (fs.existsSync(resolvedExtendsPath)) {
        baseConfig = parseTsConfig(resolvedExtendsPath)
      }
    }

    const compilerOptions = parsed.compilerOptions ?? {}

    return {
      baseUrl: compilerOptions.baseUrl ?? baseConfig?.baseUrl,
      paths: { ...baseConfig?.paths, ...compilerOptions.paths },
      configDir,
    }
  } catch {
    return undefined
  }
}

export function resolveAliasToPath(
  config: TsConfig,
  importPath: string,
): string | undefined {
  if (!config.paths) {
    return undefined
  }

  for (const [pattern, targets] of Object.entries(config.paths)) {
    const firstTarget = targets[0]
    if (!firstTarget) continue

    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2)
      if (importPath.startsWith(`${prefix}/`)) {
        const remainder = importPath.slice(prefix.length + 1)
        const targetBase = firstTarget.endsWith('/*')
          ? firstTarget.slice(0, -2)
          : firstTarget

        const baseDir = config.baseUrl
          ? path.resolve(config.configDir, config.baseUrl)
          : config.configDir

        return path.resolve(baseDir, targetBase, remainder)
      }
    } else if (pattern === importPath) {
      const baseDir = config.baseUrl
        ? path.resolve(config.configDir, config.baseUrl)
        : config.configDir

      return path.resolve(baseDir, firstTarget)
    }
  }

  return undefined
}

export function getAliasForPath(
  config: TsConfig,
  absolutePath: string,
): string | undefined {
  if (!config.paths) {
    return undefined
  }

  const baseDir = config.baseUrl
    ? path.resolve(config.configDir, config.baseUrl)
    : config.configDir

  for (const [pattern, targets] of Object.entries(config.paths)) {
    const firstTarget = targets[0]
    if (!firstTarget) continue

    if (pattern.endsWith('/*') && firstTarget.endsWith('/*')) {
      const targetBase = firstTarget.slice(0, -2)
      const targetDir = path.resolve(baseDir, targetBase)

      if (absolutePath.startsWith(targetDir + path.sep)) {
        const remainder = absolutePath.slice(targetDir.length + 1)
        const aliasPrefix = pattern.slice(0, -2)

        const withoutExt = remainder.replace(/\.(tsx?|jsx?)$/, '')
        return `${aliasPrefix}/${withoutExt}`
      }
    }
  }

  return undefined
}

export function getBestImportPath(
  config: TsConfig | undefined,
  fromFile: string,
  toFile: string,
): string {
  if (config) {
    const alias = getAliasForPath(config, toFile)
    if (alias) {
      return alias
    }
  }

  const fromDir = path.dirname(fromFile)
  let relativePath = path.relative(fromDir, toFile)

  relativePath = relativePath.replace(/\.(tsx?|jsx?)$/, '')

  if (!relativePath.startsWith('.')) {
    relativePath = `./${relativePath}`
  }

  return relativePath
}
