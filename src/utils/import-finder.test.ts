import { describe, it, expect } from 'vitest'
import { parseImports, resolveImportPath } from './import-finder'
import type { TsConfig } from './tsconfig-utils'

describe('import-finder', () => {
  describe('parseImports', () => {
    it('should parse static import', () => {
      const code = `import { foo } from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse default import', () => {
      const code = `import foo from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse namespace import', () => {
      const code = `import * as foo from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse type-only import', () => {
      const code = `import type { Foo } from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse re-export', () => {
      const code = `export { foo } from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse type-only re-export', () => {
      const code = `export type { Foo } from './foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse dynamic import', () => {
      const code = `const foo = import('./foo')`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse require', () => {
      const code = `const foo = require('./foo')`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('./foo')
    })

    it('should parse multiple imports', () => {
      const code = `
        import { a } from './a'
        import { b } from './b'
        export { c } from './c'
      `
      const imports = parseImports(code)

      expect(imports).toHaveLength(3)
      expect(imports.map((i) => i.importPath)).toEqual(['./a', './b', './c'])
    })

    it('should capture correct positions', () => {
      const code = `import { foo } from './foo'`
      const imports = parseImports(code)
      const firstImport = imports.at(0)

      expect(firstImport).toBeDefined()
      expect(firstImport?.start).toBe(21)
      expect(firstImport?.end).toBe(26)
      expect(code.slice(firstImport?.start, firstImport?.end)).toBe('./foo')
    })

    it('should handle aliased imports', () => {
      const code = `import { foo } from '@utils/foo'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('@utils/foo')
    })

    it('should handle node_modules imports', () => {
      const code = `import React from 'react'`
      const imports = parseImports(code)

      expect(imports).toHaveLength(1)
      expect(imports.at(0)?.importPath).toBe('react')
    })

    it('should handle side-effect imports', () => {
      const code = `import './styles.css'`
      const imports = parseImports(code)

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
