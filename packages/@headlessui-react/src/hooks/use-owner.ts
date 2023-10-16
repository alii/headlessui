import { useMemo } from 'react'
import { getRootDocument, getRootNode } from '../utils/owner'

/**
 * Hook to get the root node
 * @param args Params
 * @returns The root Node for which things should be attached to (in case of Shadow DOM)
 */
export function useRootNode(...args: Parameters<typeof getRootNode>) {
  return useMemo(() => getRootNode(...args), [...args])
}

/**
 * Hook to get the root document
 * @param args Params
 * @returns The root document for which things should be attached to
 */
export function useRootDocument(...args: Parameters<typeof getRootDocument>) {
  return useMemo(() => getRootDocument(...args), [...args])
}

export function ownerToRootElement(owner: Document | ShadowRoot) {
  if (owner instanceof Document) {
    return owner.body
  }

  return owner
}
