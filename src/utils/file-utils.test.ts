import { describe, it, expect } from 'vitest'
import {
  getExtensionForLanguage,
  suggestFileName,
  resolveTargetPath,
  getRelativeImportPath,
} from './file-utils'
import {
  extractDeclarationNames,
  findReferencedNames,
} from './ast-utils'

describe('file-utils', () => {
  describe('getExtensionForLanguage', () => {
    it('should return .ts for typescript', () => {
      expect(getExtensionForLanguage('typescript')).toBe('.ts')
    })

    it('should return .tsx for typescriptreact', () => {
      expect(getExtensionForLanguage('typescriptreact')).toBe('.tsx')
    })

    it('should return .js for javascript', () => {
      expect(getExtensionForLanguage('javascript')).toBe('.js')
    })

    it('should return .jsx for javascriptreact', () => {
      expect(getExtensionForLanguage('javascriptreact')).toBe('.jsx')
    })
  })

  describe('suggestFileName', () => {
    it('should extract name from function declaration', async () => {
      const code = 'function calculateTotal() { return 0 }'
      expect(await suggestFileName(code, 'typescript')).toBe('./calculate-total.ts')
    })

    it('should extract name from async function declaration', async () => {
      const code = 'async function fetchData() { return [] }'
      expect(await suggestFileName(code, 'typescript')).toBe('./fetch-data.ts')
    })

    it('should extract name from class declaration', async () => {
      const code = 'class UserService { }'
      expect(await suggestFileName(code, 'typescript')).toBe('./user-service.ts')
    })

    it('should extract name from const declaration', async () => {
      const code = 'const myHelper = () => {}'
      expect(await suggestFileName(code, 'typescript')).toBe('./my-helper.ts')
    })

    it('should extract name from interface declaration', async () => {
      const code = 'interface UserData { name: string }'
      expect(await suggestFileName(code, 'typescript')).toBe('./user-data.ts')
    })

    it('should extract name from type declaration', async () => {
      const code = 'type ResponseType = { data: unknown }'
      expect(await suggestFileName(code, 'typescript')).toBe('./response-type.ts')
    })

    it('should extract name from export function', async () => {
      const code = 'export function helperFunc() {}'
      expect(await suggestFileName(code, 'typescript')).toBe('./helper-func.ts')
    })

    it('should return default name when no declaration found', async () => {
      const code = '{ foo: "bar" }'
      expect(await suggestFileName(code, 'typescript')).toBe('./extracted.ts')
    })

    it('should use correct extension for different languages', async () => {
      const code = 'function MyComponent() { return <div /> }'
      expect(await suggestFileName(code, 'typescriptreact')).toBe('./my-component.tsx')
      expect(await suggestFileName(code, 'javascriptreact')).toBe('./my-component.jsx')
    })

    it('should convert PascalCase to kebab-case', async () => {
      const code = 'class MyAwesomeService {}'
      expect(await suggestFileName(code, 'typescript')).toBe('./my-awesome-service.ts')
    })
  })

  describe('resolveTargetPath', () => {
    it('should resolve relative path with extension', () => {
      const result = resolveTargetPath('/src', './utils.ts', 'typescript')
      expect(result).toBe('/src/utils.ts')
    })

    it('should add extension when missing', () => {
      const result = resolveTargetPath('/src', './utils', 'typescript')
      expect(result).toBe('/src/utils.ts')
    })

    it('should handle nested paths', () => {
      const result = resolveTargetPath('/src', './helpers/utils', 'typescript')
      expect(result).toBe('/src/helpers/utils.ts')
    })

    it('should handle parent directory references', () => {
      const result = resolveTargetPath('/src/features', '../utils', 'typescript')
      expect(result).toBe('/src/utils.ts')
    })

    it('should use correct extension for each language', () => {
      expect(resolveTargetPath('/src', './file', 'typescript')).toBe('/src/file.ts')
      expect(resolveTargetPath('/src', './file', 'typescriptreact')).toBe('/src/file.tsx')
      expect(resolveTargetPath('/src', './file', 'javascript')).toBe('/src/file.js')
      expect(resolveTargetPath('/src', './file', 'javascriptreact')).toBe('/src/file.jsx')
    })
  })

  describe('getRelativeImportPath', () => {
    it('should generate relative import path in same directory', () => {
      const result = getRelativeImportPath('/src/file.ts', '/src/utils.ts')
      expect(result).toBe('./utils')
    })

    it('should generate relative import path to parent directory', () => {
      const result = getRelativeImportPath('/src/features/file.ts', '/src/utils.ts')
      expect(result).toBe('../utils')
    })

    it('should generate relative import path to nested directory', () => {
      const result = getRelativeImportPath('/src/file.ts', '/src/helpers/utils.ts')
      expect(result).toBe('./helpers/utils')
    })

    it('should remove .ts extension', () => {
      const result = getRelativeImportPath('/src/a.ts', '/src/b.ts')
      expect(result).toBe('./b')
    })

    it('should remove .tsx extension', () => {
      const result = getRelativeImportPath('/src/a.tsx', '/src/b.tsx')
      expect(result).toBe('./b')
    })

    it('should remove .js extension', () => {
      const result = getRelativeImportPath('/src/a.js', '/src/b.js')
      expect(result).toBe('./b')
    })

    it('should handle deeply nested paths', () => {
      const result = getRelativeImportPath(
        '/src/features/auth/login.ts',
        '/src/utils/helpers/format.ts',
      )
      expect(result).toBe('../../utils/helpers/format')
    })
  })

})

describe('ast-utils', () => {
  describe('extractDeclarationNames', () => {
    it('should extract function name', async () => {
      expect(await extractDeclarationNames('function myFunc() {}')).toEqual(['myFunc'])
    })

    it('should extract async function name', async () => {
      expect(await extractDeclarationNames('async function fetchData() {}')).toEqual([
        'fetchData',
      ])
    })

    it('should extract exported function name', async () => {
      expect(await extractDeclarationNames('export function helper() {}')).toEqual([
        'helper',
      ])
    })

    it('should extract const name', async () => {
      expect(await extractDeclarationNames('const myConst = 123')).toEqual(['myConst'])
    })

    it('should extract class name', async () => {
      expect(await extractDeclarationNames('class MyClass {}')).toEqual(['MyClass'])
    })

    it('should extract interface name', async () => {
      expect(await extractDeclarationNames('interface MyInterface {}')).toEqual([
        'MyInterface',
      ])
    })

    it('should extract type name', async () => {
      expect(await extractDeclarationNames('type MyType = string')).toEqual(['MyType'])
    })

    it('should extract enum name', async () => {
      expect(await extractDeclarationNames('enum Status { Active }')).toEqual([
        'Status',
      ])
    })

    it('should return empty array for plain expressions', async () => {
      expect(await extractDeclarationNames('1 + 2')).toEqual([])
    })

    it('should extract multiple declarations', async () => {
      const code = `
        const a = 1
        function b() {}
        class C {}
      `
      expect(await extractDeclarationNames(code)).toEqual(['a', 'b', 'C'])
    })
  })

  describe('findReferencedNames', () => {
    it('should find referenced names in code', async () => {
      expect(await findReferencedNames('console.log(x)', ['x'])).toEqual(['x'])
    })

    it('should return empty when name is not referenced', async () => {
      expect(await findReferencedNames('console.log(y)', ['x'])).toEqual([])
    })

    it('should not match declarations as references', async () => {
      expect(await findReferencedNames('const foo = 1', ['foo'])).toEqual([])
    })

    it('should find function calls', async () => {
      expect(await findReferencedNames('helper()', ['helper'])).toEqual(['helper'])
    })

    it('should find multiple references', async () => {
      const code = 'console.log(a, b)'
      expect(await findReferencedNames(code, ['a', 'b', 'c'])).toEqual(['a', 'b'])
    })

    it('should not match parameter declarations', async () => {
      expect(await findReferencedNames('function foo(x) {}', ['x'])).toEqual([])
    })

    it('should find references inside functions', async () => {
      const code = 'function test() { return helper() }'
      expect(await findReferencedNames(code, ['helper'])).toEqual(['helper'])
    })
  })
})
