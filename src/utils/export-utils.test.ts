import { describe, it, expect } from 'vitest'
import { extractExports, resolveMainExport } from './export-utils'

describe('export-utils', () => {
  describe('extractExports', () => {
    it('should extract exported function', async () => {
      const code = 'export function myFunction() {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'myFunction',
        isType: false,
      })
    })

    it('should extract exported async function', async () => {
      const code = 'export async function fetchData() {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'fetchData',
        isType: false,
      })
    })

    it('should extract exported class', async () => {
      const code = 'export class MyClass {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'MyClass',
        isType: false,
      })
    })

    it('should extract exported const', async () => {
      const code = 'export const myConst = 42'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'myConst',
        isType: false,
      })
    })

    it('should extract exported let', async () => {
      const code = 'export let myVar = "hello"'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'myVar',
        isType: false,
      })
    })

    it('should extract exported interface as type', async () => {
      const code = 'export interface MyInterface { name: string }'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'MyInterface',
        isType: true,
      })
    })

    it('should extract exported type alias as type', async () => {
      const code = 'export type MyType = string | number'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'MyType',
        isType: true,
      })
    })

    it('should extract exported enum', async () => {
      const code = 'export enum Status { Active, Inactive }'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'Status',
        isType: false,
      })
    })

    it('should extract multiple exports', async () => {
      const code = `
        export function helperFunc() {}
        export interface Config { key: string }
        export const VALUE = 42
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(3)
      expect(exports.map((e) => e.name)).toEqual(['helperFunc', 'Config', 'VALUE'])
    })

    it('should extract named exports from export declaration', async () => {
      const code = `
        const foo = 1
        const bar = 2
        export { foo, bar }
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(2)
      expect(exports.map((e) => e.name)).toEqual(['foo', 'bar'])
    })

    it('should mark export type declarations as type', async () => {
      const code = `
        interface Foo {}
        export type { Foo }
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'Foo',
        isType: true,
      })
    })

    it('should mark individual type-only export specifiers as type', async () => {
      const code = `
        interface Foo {}
        const bar = 1
        export { type Foo, bar }
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(2)
      expect(exports[0]).toMatchObject({ name: 'Foo', isType: true })
      expect(exports[1]).toMatchObject({ name: 'bar', isType: false })
    })

    it('should not extract non-exported declarations', async () => {
      const code = `
        function privateFunc() {}
        const privateConst = 42
        export function publicFunc() {}
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]?.name).toBe('publicFunc')
    })

    it('should not extract re-exports', async () => {
      const code = `export { something } from './other'`
      const exports = await extractExports(code)
      expect(exports).toHaveLength(0)
    })

    it('should extract default exported function with name', async () => {
      const code = 'export default function MyComponent() {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'MyComponent',
        isType: false,
      })
    })

    it('should extract default exported class with name', async () => {
      const code = 'export default class MyService {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      expect(exports[0]).toMatchObject({
        name: 'MyService',
        isType: false,
      })
    })

    it('should not extract anonymous default export', async () => {
      const code = 'export default function() {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(0)
    })

    it('should have correct name offsets', async () => {
      const code = 'export function myFunc() {}'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      const exp = exports[0]
      expect(exp).toBeDefined()
      expect(code.slice(exp?.nameStart, exp?.nameEnd)).toBe('myFunc')
    })

    it('should have correct declaration offsets', async () => {
      const code = 'export function myFunc() { return 1 }'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(1)
      const exp = exports[0]
      expect(exp).toBeDefined()
      expect(code.slice(exp?.declarationStart, exp?.declarationEnd)).toBe(code)
    })

    it('should extract multiple variable declarations in one statement', async () => {
      const code = 'export const a = 1, b = 2'
      const exports = await extractExports(code)
      expect(exports).toHaveLength(2)
      expect(exports.map((e) => e.name)).toEqual(['a', 'b'])
    })

    it('should handle mixed type and value exports', async () => {
      const code = `
        export interface UserProps { name: string }
        export type UserId = string
        export function createUser() {}
        export const DEFAULT_NAME = 'test'
      `
      const exports = await extractExports(code)
      expect(exports).toHaveLength(4)
      expect(exports.filter((e) => e.isType)).toHaveLength(2)
      expect(exports.filter((e) => !e.isType)).toHaveLength(2)
    })
  })

  describe('resolveMainExport', () => {
    it('should return undefined for empty exports', () => {
      expect(resolveMainExport([], 0)).toBeUndefined()
    })

    it('should return single export regardless of cursor position', () => {
      const exports = [
        {
          name: 'myFunc',
          isType: false,
          nameStart: 16,
          nameEnd: 22,
          declarationStart: 0,
          declarationEnd: 30,
        },
      ]
      expect(resolveMainExport(exports, 100)?.name).toBe('myFunc')
    })

    it('should return single type export when it is the only export', () => {
      const exports = [
        {
          name: 'MyInterface',
          isType: true,
          nameStart: 17,
          nameEnd: 28,
          declarationStart: 0,
          declarationEnd: 50,
        },
      ]
      expect(resolveMainExport(exports, 0)?.name).toBe('MyInterface')
    })

    it('should return single non-type export when mixed with types', () => {
      const exports = [
        {
          name: 'MyInterface',
          isType: true,
          nameStart: 17,
          nameEnd: 28,
          declarationStart: 0,
          declarationEnd: 50,
        },
        {
          name: 'myFunc',
          isType: false,
          nameStart: 67,
          nameEnd: 73,
          declarationStart: 51,
          declarationEnd: 100,
        },
        {
          name: 'MyType',
          isType: true,
          nameStart: 117,
          nameEnd: 123,
          declarationStart: 101,
          declarationEnd: 150,
        },
      ]
      expect(resolveMainExport(exports, 0)?.name).toBe('myFunc')
    })

    it('should use cursor position when multiple non-type exports exist', () => {
      const exports = [
        {
          name: 'funcA',
          isType: false,
          nameStart: 16,
          nameEnd: 21,
          declarationStart: 0,
          declarationEnd: 30,
        },
        {
          name: 'funcB',
          isType: false,
          nameStart: 47,
          nameEnd: 52,
          declarationStart: 31,
          declarationEnd: 60,
        },
      ]
      expect(resolveMainExport(exports, 35)?.name).toBe('funcB')
    })

    it('should return undefined when cursor is not on any export', () => {
      const exports = [
        {
          name: 'funcA',
          isType: false,
          nameStart: 16,
          nameEnd: 21,
          declarationStart: 0,
          declarationEnd: 30,
        },
        {
          name: 'funcB',
          isType: false,
          nameStart: 47,
          nameEnd: 52,
          declarationStart: 31,
          declarationEnd: 60,
        },
      ]
      expect(resolveMainExport(exports, 100)).toBeUndefined()
    })

    it('should use cursor when multiple type-only exports exist', () => {
      const exports = [
        {
          name: 'TypeA',
          isType: true,
          nameStart: 12,
          nameEnd: 17,
          declarationStart: 0,
          declarationEnd: 30,
        },
        {
          name: 'TypeB',
          isType: true,
          nameStart: 43,
          nameEnd: 48,
          declarationStart: 31,
          declarationEnd: 60,
        },
      ]
      expect(resolveMainExport(exports, 45)?.name).toBe('TypeB')
    })
  })
})
