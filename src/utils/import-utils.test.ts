import { describe, it, expect } from 'vitest'
import { generateImportStatement, generateExportWrapper } from './import-utils'

describe('import-utils', () => {
  describe('generateImportStatement', () => {
    it('should generate named import with export name', () => {
      const result = generateImportStatement('./utils', 'myUtil')
      expect(result).toBe("import { myUtil } from './utils'")
    })

    it('should generate side-effect import without export name', () => {
      const result = generateImportStatement('./polyfill', undefined)
      expect(result).toBe("import './polyfill'")
    })

    it('should generate side-effect import with empty string', () => {
      const result = generateImportStatement('./styles', '')
      expect(result).toBe("import './styles'")
    })

    it('should handle relative parent paths', () => {
      const result = generateImportStatement('../helpers/format', 'format')
      expect(result).toBe("import { format } from '../helpers/format'")
    })
  })

  describe('generateExportWrapper', () => {
    it('should add export to function declaration', () => {
      const code = 'function myFunc() { return 1 }'
      const result = generateExportWrapper(code, 'myFunc')
      expect(result).toBe('export function myFunc() { return 1 }\n')
    })

    it('should add export to async function declaration', () => {
      const code = 'async function fetchData() { return [] }'
      const result = generateExportWrapper(code, 'fetchData')
      expect(result).toBe('export async function fetchData() { return [] }\n')
    })

    it('should add export to class declaration', () => {
      const code = 'class MyClass { }'
      const result = generateExportWrapper(code, 'MyClass')
      expect(result).toBe('export class MyClass { }\n')
    })

    it('should add export to const declaration', () => {
      const code = 'const myConst = 42'
      const result = generateExportWrapper(code, 'myConst')
      expect(result).toBe('export const myConst = 42\n')
    })

    it('should add export to let declaration', () => {
      const code = 'let myVar = "hello"'
      const result = generateExportWrapper(code, 'myVar')
      expect(result).toBe('export let myVar = "hello"\n')
    })

    it('should add export to interface declaration', () => {
      const code = 'interface MyInterface { name: string }'
      const result = generateExportWrapper(code, 'MyInterface')
      expect(result).toBe('export interface MyInterface { name: string }\n')
    })

    it('should add export to type declaration', () => {
      const code = 'type MyType = string | number'
      const result = generateExportWrapper(code, 'MyType')
      expect(result).toBe('export type MyType = string | number\n')
    })

    it('should not duplicate export keyword', () => {
      const code = 'export function alreadyExported() {}'
      const result = generateExportWrapper(code, 'alreadyExported')
      expect(result).toBe('export function alreadyExported() {}\n')
    })

    it('should wrap expression in const export when export name provided', () => {
      const code = '{ foo: "bar", baz: 42 }'
      const result = generateExportWrapper(code, 'myObject')
      expect(result).toBe('export const myObject = { foo: "bar", baz: 42 }\n')
    })

    it('should return raw code when no export name and not a declaration', () => {
      const code = '{ foo: "bar" }'
      const result = generateExportWrapper(code, undefined)
      expect(result).toBe('{ foo: "bar" }\n')
    })

    it('should trim whitespace from code', () => {
      const code = '  function myFunc() {}  '
      const result = generateExportWrapper(code, 'myFunc')
      expect(result).toBe('export function myFunc() {}\n')
    })

    it('should handle multiline code', () => {
      const code = `function myFunc() {
  return 1
}`
      const result = generateExportWrapper(code, 'myFunc')
      expect(result).toBe(`export function myFunc() {
  return 1
}\n`)
    })
  })
})
