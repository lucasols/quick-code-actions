import { describe, it, expect } from 'vitest'
import {
  getExtensionForLanguage,
  suggestFileName,
  resolveTargetPath,
  getRelativeImportPath,
  deriveExportName,
} from './file-utils'

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
    it('should extract name from function declaration', () => {
      const code = 'function calculateTotal() { return 0 }'
      expect(suggestFileName(code, 'typescript')).toBe('./calculate-total.ts')
    })

    it('should extract name from async function declaration', () => {
      const code = 'async function fetchData() { return [] }'
      expect(suggestFileName(code, 'typescript')).toBe('./fetch-data.ts')
    })

    it('should extract name from class declaration', () => {
      const code = 'class UserService { }'
      expect(suggestFileName(code, 'typescript')).toBe('./user-service.ts')
    })

    it('should extract name from const declaration', () => {
      const code = 'const myHelper = () => {}'
      expect(suggestFileName(code, 'typescript')).toBe('./my-helper.ts')
    })

    it('should extract name from interface declaration', () => {
      const code = 'interface UserData { name: string }'
      expect(suggestFileName(code, 'typescript')).toBe('./user-data.ts')
    })

    it('should extract name from type declaration', () => {
      const code = 'type ResponseType = { data: unknown }'
      expect(suggestFileName(code, 'typescript')).toBe('./response-type.ts')
    })

    it('should extract name from export function', () => {
      const code = 'export function helperFunc() {}'
      expect(suggestFileName(code, 'typescript')).toBe('./helper-func.ts')
    })

    it('should return default name when no declaration found', () => {
      const code = '{ foo: "bar" }'
      expect(suggestFileName(code, 'typescript')).toBe('./extracted.ts')
    })

    it('should use correct extension for different languages', () => {
      const code = 'function MyComponent() { return <div /> }'
      expect(suggestFileName(code, 'typescriptreact')).toBe('./my-component.tsx')
      expect(suggestFileName(code, 'javascriptreact')).toBe('./my-component.jsx')
    })

    it('should convert PascalCase to kebab-case', () => {
      const code = 'class MyAwesomeService {}'
      expect(suggestFileName(code, 'typescript')).toBe('./my-awesome-service.ts')
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

  describe('deriveExportName', () => {
    it('should convert simple name to PascalCase', () => {
      expect(deriveExportName('utils.ts')).toBe('Utils')
    })

    it('should convert kebab-case to PascalCase', () => {
      expect(deriveExportName('my-helper.ts')).toBe('MyHelper')
    })

    it('should convert snake_case to PascalCase', () => {
      expect(deriveExportName('my_helper.ts')).toBe('MyHelper')
    })

    it('should handle paths with directories', () => {
      expect(deriveExportName('./helpers/string-utils.ts')).toBe('StringUtils')
    })

    it('should handle multiple separators', () => {
      expect(deriveExportName('my-awesome_helper.ts')).toBe('MyAwesomeHelper')
    })
  })
})
