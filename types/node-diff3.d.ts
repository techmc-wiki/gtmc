declare module "node-diff3" {
  export interface MergeDiff3Result {
    conflict: boolean
    result: string[]
  }

  export interface MergeDiff3Options {
    label?: {
      a?: string
      o?: string
      b?: string
    }
    stringSeparator?: string | RegExp
    excludeFalseConflicts?: boolean
  }

  export function mergeDiff3(
    a: string[] | string,
    o: string[] | string,
    b: string[] | string,
    options?: MergeDiff3Options
  ): MergeDiff3Result
}
