import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  findTsConfig,
  parseTsConfig,
  resolveAliasToPath,
  getAliasForPath,
  getBestImportPath,
} from './tsconfig-utils'

vi.mock('fs')

describe('tsconfig-utils', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findTsConfig', () => {
    it('should find tsconfig.json', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p === '/workspace/tsconfig.json'
      })

      const result = findTsConfig('/workspace')
      expect(result).toBe('/workspace/tsconfig.json')
    })

    it('should find jsconfig.json when tsconfig.json is missing', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return p === '/workspace/jsconfig.json'
      })

      const result = findTsConfig('/workspace')
      expect(result).toBe('/workspace/jsconfig.json')
    })

    it('should prefer tsconfig.json over jsconfig.json', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = findTsConfig('/workspace')
      expect(result).toBe('/workspace/tsconfig.json')
    })

    it('should return undefined when no config found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      const result = findTsConfig('/workspace')
      expect(result).toBeUndefined()
    })
  })

  describe('parseTsConfig', () => {
    it('should parse basic tsconfig', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          compilerOptions: {
            baseUrl: './src',
            paths: {
              '@utils/*': ['utils/*'],
            },
          },
        }),
      )

      const result = parseTsConfig('/workspace/tsconfig.json')

      expect(result).toEqual({
        baseUrl: './src',
        paths: { '@utils/*': ['utils/*'] },
        configDir: '/workspace',
      })
    })

    it('should handle tsconfig with comments', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(`{
        // This is a comment
        "compilerOptions": {
          "baseUrl": "." /* inline comment */
        }
      }`)

      const result = parseTsConfig('/workspace/tsconfig.json')

      expect(result?.baseUrl).toBe('.')
    })

    it('should handle extends', () => {
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        if (p === '/workspace/tsconfig.json') {
          return JSON.stringify({
            extends: './tsconfig.base.json',
            compilerOptions: {
              paths: {
                '@app/*': ['app/*'],
              },
            },
          })
        }
        if (p === '/workspace/tsconfig.base.json') {
          return JSON.stringify({
            compilerOptions: {
              baseUrl: './src',
              paths: {
                '@utils/*': ['utils/*'],
              },
            },
          })
        }
        throw new Error('File not found')
      })

      vi.mocked(fs.existsSync).mockReturnValue(true)

      const result = parseTsConfig('/workspace/tsconfig.json')

      expect(result?.baseUrl).toBe('./src')
      expect(result?.paths).toEqual({
        '@utils/*': ['utils/*'],
        '@app/*': ['app/*'],
      })
    })

    it('should return undefined on parse error', () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = parseTsConfig('/workspace/tsconfig.json')
      expect(result).toBeUndefined()
    })
  })

  describe('resolveAliasToPath', () => {
    const config = {
      baseUrl: './src',
      paths: {
        '@utils/*': ['utils/*'],
        '@components/*': ['components/*'],
        '@config': ['config/index'],
      },
      configDir: '/workspace',
    }

    it('should resolve wildcard alias', () => {
      const result = resolveAliasToPath(config, '@utils/helpers')
      expect(result).toBe(path.resolve('/workspace/src/utils/helpers'))
    })

    it('should resolve exact alias', () => {
      const result = resolveAliasToPath(config, '@config')
      expect(result).toBe(path.resolve('/workspace/src/config/index'))
    })

    it('should return undefined for unknown alias', () => {
      const result = resolveAliasToPath(config, '@unknown/foo')
      expect(result).toBeUndefined()
    })

    it('should return undefined for relative path', () => {
      const result = resolveAliasToPath(config, './utils')
      expect(result).toBeUndefined()
    })

    it('should return undefined when no paths configured', () => {
      const result = resolveAliasToPath({ configDir: '/workspace' }, '@utils/foo')
      expect(result).toBeUndefined()
    })
  })

  describe('getAliasForPath', () => {
    const config = {
      baseUrl: './src',
      paths: {
        '@utils/*': ['utils/*'],
        '@components/*': ['components/*'],
      },
      configDir: '/workspace',
    }

    it('should get alias for path under aliased directory', () => {
      const absolutePath = path.resolve('/workspace/src/utils/helpers.ts')
      const result = getAliasForPath(config, absolutePath)
      expect(result).toBe('@utils/helpers')
    })

    it('should return undefined for path not under aliased directory', () => {
      const absolutePath = path.resolve('/workspace/src/services/api.ts')
      const result = getAliasForPath(config, absolutePath)
      expect(result).toBeUndefined()
    })

    it('should return undefined when no paths configured', () => {
      const result = getAliasForPath(
        { configDir: '/workspace' },
        '/workspace/src/utils/helpers.ts',
      )
      expect(result).toBeUndefined()
    })

    it('should strip file extension from alias', () => {
      const absolutePath = path.resolve('/workspace/src/utils/helpers.tsx')
      const result = getAliasForPath(config, absolutePath)
      expect(result).toBe('@utils/helpers')
    })
  })

  describe('getBestImportPath', () => {
    const config = {
      baseUrl: './src',
      paths: {
        '@utils/*': ['utils/*'],
      },
      configDir: '/workspace',
    }

    it('should prefer alias when available', () => {
      const fromFile = '/workspace/src/app/page.ts'
      const toFile = path.resolve('/workspace/src/utils/helpers.ts')

      const result = getBestImportPath(config, fromFile, toFile)
      expect(result).toBe('@utils/helpers')
    })

    it('should use relative path when no alias matches', () => {
      const fromFile = '/workspace/src/app/page.ts'
      const toFile = '/workspace/src/services/api.ts'

      const result = getBestImportPath(config, fromFile, toFile)
      expect(result).toBe('../services/api')
    })

    it('should use relative path when no config provided', () => {
      const fromFile = '/workspace/src/app/page.ts'
      const toFile = '/workspace/src/utils/helpers.ts'

      const result = getBestImportPath(undefined, fromFile, toFile)
      expect(result).toBe('../utils/helpers')
    })

    it('should add ./ prefix for same directory imports', () => {
      const fromFile = '/workspace/src/utils/a.ts'
      const toFile = '/workspace/src/utils/b.ts'

      const result = getBestImportPath(undefined, fromFile, toFile)
      expect(result).toBe('./b')
    })
  })
})
