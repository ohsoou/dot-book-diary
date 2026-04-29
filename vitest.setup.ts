import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

expect.extend(matchers)

declare module 'vitest' {
  interface Assertion<T = any>
    extends matchers.TestingLibraryMatchers<typeof expect.stringContaining, T> {}
}