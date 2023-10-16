import { type MutableRefObject } from 'react'
import { env } from './env'

export function getOwnerDocument<T extends Element | MutableRefObject<Element | null>>(
  element: T | null | undefined
) {
  if (env.isServer) {
    return null
  }

  if (element instanceof Node) {
    return element.getRootNode() as DocumentFragment
  }

  if (element?.hasOwnProperty('current') && element.current instanceof Node) {
    return element.current.ownerDocument
  }

  return document
}
