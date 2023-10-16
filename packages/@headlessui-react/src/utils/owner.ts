import { type MutableRefObject } from 'react'
import { env } from './env'

export function getRootOwner<T extends Element | MutableRefObject<Element | null>>(
  element: T | null | undefined
) {
  if (env.isServer) {
    return null
  }

  if (element instanceof Node) {
    const rootNode = element.getRootNode()

    if (rootNode instanceof ShadowRoot) {
      return rootNode
    }

    return element.ownerDocument
  }

  if (element?.hasOwnProperty('current') && element.current instanceof Node) {
    return element.current.ownerDocument
  }

  return document
}

export function getRootOwnerDocument<T extends Element | MutableRefObject<Element | null>>(
  element: T | null | undefined
) {
  if (env.isServer) {
    return null
  }

  if (element instanceof Node) {
    return element.ownerDocument
  }

  if (element?.hasOwnProperty('current') && element.current instanceof Node) {
    return element.current.ownerDocument
  }

  return document
}
