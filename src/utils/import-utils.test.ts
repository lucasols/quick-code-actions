import { describe, it, expect } from 'vitest'
import { generateImportStatement, generateExportStatement } from './import-utils'

describe('import-utils', () => {
  describe('generateImportStatement', () => {
    it('should generate named import with single name', () => {
      const result = generateImportStatement('./utils', ['myUtil'])
      expect(result).toBe("import { myUtil } from './utils'")
    })

    it('should generate named import with multiple names', () => {
      const result = generateImportStatement('./utils', ['a', 'b', 'c'])
      expect(result).toBe("import { a, b, c } from './utils'")
    })

    it('should generate side-effect import with empty array', () => {
      const result = generateImportStatement('./polyfill', [])
      expect(result).toBe("import './polyfill'")
    })

    it('should handle relative parent paths', () => {
      const result = generateImportStatement('../helpers/format', ['format'])
      expect(result).toBe("import { format } from '../helpers/format'")
    })
  })

  describe('generateExportStatement', () => {
    it('should add export to function declaration', async () => {
      const code = 'function myFunc() { return 1 }'
      const result = await generateExportStatement(code)
      expect(result).toBe('export function myFunc() { return 1 }\n')
    })

    it('should add export to async function declaration', async () => {
      const code = 'async function fetchData() { return [] }'
      const result = await generateExportStatement(code)
      expect(result).toBe('export async function fetchData() { return [] }\n')
    })

    it('should add export to class declaration', async () => {
      const code = 'class MyClass { }'
      const result = await generateExportStatement(code)
      expect(result).toBe('export class MyClass { }\n')
    })

    it('should add export to const declaration', async () => {
      const code = 'const myConst = 42'
      const result = await generateExportStatement(code)
      expect(result).toBe('export const myConst = 42\n')
    })

    it('should add export to let declaration', async () => {
      const code = 'let myVar = "hello"'
      const result = await generateExportStatement(code)
      expect(result).toBe('export let myVar = "hello"\n')
    })

    it('should add export to interface declaration', async () => {
      const code = 'interface MyInterface { name: string }'
      const result = await generateExportStatement(code)
      expect(result).toBe('export interface MyInterface { name: string }\n')
    })

    it('should add export to type declaration', async () => {
      const code = 'type MyType = string | number'
      const result = await generateExportStatement(code)
      expect(result).toBe('export type MyType = string | number\n')
    })

    it('should not duplicate export keyword', async () => {
      const code = 'export function alreadyExported() {}'
      const result = await generateExportStatement(code)
      expect(result).toBe('export function alreadyExported() {}\n')
    })

    it('should add export to enum declaration', async () => {
      const code = 'enum Status { Active, Inactive }'
      const result = await generateExportStatement(code)
      expect(result).toBe('export enum Status { Active, Inactive }\n')
    })

    it('should trim whitespace from code', async () => {
      const code = '  function myFunc() {}  '
      const result = await generateExportStatement(code)
      expect(result).toBe('export function myFunc() {}\n')
    })

    it('should handle multiline code', async () => {
      const code = `function myFunc() {
  return 1
}`
      const result = await generateExportStatement(code)
      expect(result).toBe(`export function myFunc() {
  return 1
}\n`)
    })
  })
})
