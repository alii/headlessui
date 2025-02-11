import React, { MutableRefObject, useMemo, useRef } from 'react'
import { Features as HiddenFeatures, Hidden } from '../internal/hidden'
import { useEvent } from './use-event'
import { useRootNode } from './use-owner'

export function useRootContainers({
  defaultContainers = [],
  portals,
  mainTreeNodeRef: _mainTreeNodeRef,
}: {
  defaultContainers?: (HTMLElement | null | MutableRefObject<HTMLElement | null>)[]
  portals?: MutableRefObject<HTMLElement[]>
  mainTreeNodeRef?: MutableRefObject<HTMLElement | null>
} = {}) {
  // Reference to a node in the "main" tree, not in the portalled Dialog tree.
  let mainTreeNodeRef = useRef<HTMLElement | null>(_mainTreeNodeRef?.current ?? null)
  let ownerRoot = useRootNode(mainTreeNodeRef)

  let resolveContainers = useEvent(() => {
    let containers: HTMLElement[] = []

    // Resolve default containers
    for (let container of defaultContainers) {
      if (container === null) continue
      if (container instanceof HTMLElement) {
        containers.push(container)
      } else if ('current' in container && container.current instanceof HTMLElement) {
        containers.push(container.current)
      }
    }

    // Resolve portal containers
    if (portals?.current) {
      for (let portal of portals.current) {
        containers.push(portal)
      }
    }

    // Resolve third party (root) containers
    for (let container of ownerRoot?.querySelectorAll('html > *, body > *') ?? []) {
      if (container === document.body) continue // Skip `<body>`
      if (container === document.head) continue // Skip `<head>`
      if (!(container instanceof HTMLElement)) continue // Skip non-HTMLElements
      if (container.id === 'headlessui-portal-root') continue // Skip the Headless UI portal root
      if (container.contains(mainTreeNodeRef.current)) continue // Skip if it is the main app
      if (containers.some((defaultContainer) => container.contains(defaultContainer))) continue // Skip if the current container is part of a container we've already seen (e.g.: default container / portal)

      containers.push(container)
    }

    return containers
  })

  return {
    resolveContainers,
    contains: useEvent((element: HTMLElement) =>
      resolveContainers().some((container) => container.contains(element))
    ),
    mainTreeNodeRef,
    MainTreeNode: useMemo(() => {
      return function MainTreeNode() {
        if (_mainTreeNodeRef != null) return null
        return <Hidden features={HiddenFeatures.Hidden} ref={mainTreeNodeRef} />
      }
    }, [mainTreeNodeRef, _mainTreeNodeRef]),
  }
}

export function useMainTreeNode() {
  let mainTreeNodeRef = useRef<HTMLElement | null>(null)

  return {
    mainTreeNodeRef,
    MainTreeNode: useMemo(() => {
      return function MainTreeNode() {
        return <Hidden features={HiddenFeatures.Hidden} ref={mainTreeNodeRef} />
      }
    }, [mainTreeNodeRef]),
  }
}
