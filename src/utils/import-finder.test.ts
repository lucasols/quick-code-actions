import { describe, it, expect } from 'vitest'
import { parseImports, resolveImportPath } from './import-finder'
import type { TsConfig } from './tsconfig-utils'

describe('import-finder', () => {
  describe('parseImports', () => {
    it('should parse static import', async () => {
      const code = `import { foo } from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse default import', async () => {
      const code = `import foo from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse namespace import', async () => {
      const code = `import * as foo from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse type-only import', async () => {
      const code = `import type { Foo } from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse re-export', async () => {
      const code = `export { foo } from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse type-only re-export', async () => {
      const code = `export type { Foo } from './foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse dynamic import', async () => {
      const code = `const foo = import('./foo')`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse require', async () => {
      const code = `const foo = require('./foo')`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse multiple imports', async () => {
      const code = `
        import { a } from './a'
        import { b } from './b'
        export { c } from './c'
      `
      const imports = await parseImports(code)

      expect(imports).toHaveLength(3)
      expect(imports.map((i) => i.importPath)).toEqual(['./a', './b', './c'])
    })

    it('should capture correct positions', async () => {
      const code = `import { foo } from './foo'`
      const imports = await parseImports(code)
      const firstImport = imports.at(0)

      expect(firstImport).toBeDefined()
      expect(firstImport?.start).toBe(21)
      expect(firstImport?.end).toBe(26)
      expect(code.slice(firstImport?.start, firstImport?.end)).toBe('./foo')
    })

    it('should handle aliased imports', async () => {
      const code = `import { foo } from '@utils/foo'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('@utils/foo')
    })

    it('should handle node_modules imports', async () => {
      const code = `import React from 'react'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('react')
    })

    it('should handle side-effect imports', async () => {
      const code = `import './styles.css'`
      const imports = await parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./styles.css')
    })
  })

  describe('resolveImportPath', () => {
    it('should resolve relative import', () => {
      const result = resolveImportPath(
        '/workspace/src/app/page.ts',
        './utils',
        undefined,
      )
      expect(result).toBe('/workspace/src/app/utils')
    })

    it('should resolve parent relative import', () => {
      const result = resolveImportPath(
        '/workspace/src/app/page.ts',
        '../utils/helpers',
        undefined,
      )
      expect(result).toBe('/workspace/src/utils/helpers')
    })

    it('should resolve alias with config', () => {
      const config: TsConfig = {
        baseUrl: './src',
        paths: {
          '@utils/*': ['utils/*'],
        },
        configDir: '/workspace',
      }

      const result = resolveImportPath(
        '/workspace/src/app/page.ts',
        '@utils/helpers',
        config,
      )

      expect(result).toContain('utils')
      expect(result).toContain('helpers')
    })

    it('should return undefined for node_modules import', () => {
      const result = resolveImportPath(
        '/workspace/src/app/page.ts',
        'react',
        undefined,
      )
      expect(result).toBeUndefined()
    })

    it('should return undefined for unknown alias', () => {
      const config: TsConfig = {
        baseUrl: './src',
        paths: {
          '@utils/*': ['utils/*'],
        },
        configDir: '/workspace',
      }

      const result = resolveImportPath(
        '/workspace/src/app/page.ts',
        '@unknown/foo',
        config,
      )
      expect(result).toBeUndefined()
    })
  })
})
