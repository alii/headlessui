import { useMemo } from 'react'
import { getRootOwner, getRootOwnerDocument } from '../utils/owner'

/**
 * Hook to get the root node
 * @param args Params
 * @returns The root Node for which things should be attached to (in case of Shadow DOM)
 */
export function useRootOwner(...args: Parameters<typeof getRootOwner>) {
  return useMemo(() => getRootOwner(...args), [...args])
}

/**
 * Hook to get the root document
 * @param args Params
 * @returns The root document for which things should be attached to
 */
export function useRootDocument(...args: Parameters<typeof getRootOwnerDocument>) {
  return useMemo(() => getRootOwnerDocument(...args), [...args])
}

export function ownerToRootElement(owner: Document | ShadowRoot | DocumentFragment) {
  if (owner instanceof Document) {
    return owner.body
  }

  return owner
}
