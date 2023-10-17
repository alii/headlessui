import React, {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ContextType,
  type ElementType,
  type MutableRefObject,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { useEvent } from '../../hooks/use-event'
import { useIsoMorphicEffect } from '../../hooks/use-iso-morphic-effect'
import { useOnUnmount } from '../../hooks/use-on-unmount'
import { ownerToRootElement, useRootDocument, useRootNode } from '../../hooks/use-owner'
import { useServerHandoffComplete } from '../../hooks/use-server-handoff-complete'
import { optionalRef, useSyncRefs } from '../../hooks/use-sync-refs'
import { usePortalRoot } from '../../internal/portal-force-root'
import type { Props } from '../../types'
import { env } from '../../utils/env'
import { forwardRefWithAs, HasDisplayName, RefProp, render } from '../../utils/render'

function usePortalTarget(ref: MutableRefObject<HTMLElement | null>): HTMLElement | null {
  let forceInRoot = usePortalRoot()
  let groupTarget = useContext(PortalGroupContext)

  let ownerRoot = useRootNode(ref)
  let ownerDocument = useRootDocument(ref)

  let [target, setTarget] = useState(() => {
    // Group context is used, but still null
    if (!forceInRoot && groupTarget !== null) return null

    // No group context is used, let's create a default portal root
    if (env.isServer || !ownerRoot || !ownerDocument) return null

    let existingRoot = ownerRoot.getElementById('headlessui-portal-root')
    if (existingRoot) return existingRoot

    let div = ownerDocument.createElement('div')
    div.setAttribute('id', 'headlessui-portal-root')

    const el = ownerToRootElement(ownerRoot)

    console.debug(el)

    return el.appendChild(div)
  })

  // Ensure the portal root is always in the DOM
  useEffect(() => {
    if (target === null) return
    if (!ownerRoot) return

    const root = ownerToRootElement(ownerRoot)

    console.log('BODY REF', ref.current)

    if (!root.contains(target)) {
      root.appendChild(target)
    }
  }, [target, ownerRoot])

  useEffect(() => {
    if (forceInRoot) return
    if (groupTarget === null) return
    setTarget(groupTarget.current)
  }, [groupTarget, setTarget, forceInRoot])

  return target
}

// ---

let DEFAULT_PORTAL_TAG = Fragment
interface PortalRenderPropArg {}

export type PortalProps<TTag extends ElementType> = Props<
  TTag,
  PortalRenderPropArg,
  never,
  { root?: HTMLElement | null }
>

function PortalFn<TTag extends ElementType = typeof DEFAULT_PORTAL_TAG>(
  { root = null, ...props }: PortalProps<TTag>,
  ref: Ref<HTMLElement>
) {
  let theirProps = props
  let internalPortalRootRef = useRef<HTMLElement | null>(null)

  let portalRef = useSyncRefs(
    optionalRef<typeof internalPortalRootRef['current']>((el) => {
      internalPortalRootRef.current = el
    }),
    ref
  )

  let setPortalRef = (el: HTMLElement | null) => {
    if (el) portalRef?.(el)
  }

  let ownerDocument = useRootDocument(internalPortalRootRef)
  let createdPortalTarget = usePortalTarget(internalPortalRootRef)
  let target = root ?? createdPortalTarget

  let [element] = useState<HTMLDivElement | null>(() => ownerDocument?.createElement('div') ?? null)
  let parent = useContext(PortalParentContext)
  let ready = useServerHandoffComplete()

  useIsoMorphicEffect(() => {
    if (!target || !element) return

    // Element already exists in target, always calling target.appendChild(element) will cause a
    // brief unmount/remount.
    if (!target.contains(element)) {
      element.setAttribute('data-headlessui-portal', '')
      target.appendChild(element)
    }
  }, [target, element])

  useIsoMorphicEffect(() => {
    if (!element) return
    if (!parent) return

    return parent.register(element)
  }, [parent, element])

  useOnUnmount(() => {
    if (!target || !element) return

    if (element instanceof Node && target.contains(element)) {
      target.removeChild(element)
    }

    if (target.childNodes.length <= 0) {
      target.parentElement?.removeChild(target)
    }
  })

  if (!ready) return null

  let ourProps = { ref: setPortalRef }

  return !target || !element
    ? null
    : createPortal(
        render({
          ourProps,
          theirProps,
          defaultTag: DEFAULT_PORTAL_TAG,
          name: 'Portal',
        }),
        element
      )
}

// ---

let DEFAULT_GROUP_TAG = Fragment
interface GroupRenderPropArg {}

let PortalGroupContext = createContext<MutableRefObject<HTMLElement | null> | null>(null)

export type PortalGroupProps<TTag extends ElementType> = Props<TTag, GroupRenderPropArg> & {
  target: MutableRefObject<HTMLElement | null>
}

function GroupFn<TTag extends ElementType = typeof DEFAULT_GROUP_TAG>(
  props: PortalGroupProps<TTag>,
  ref: Ref<HTMLElement>
) {
  let { target, ...theirProps } = props
  let groupRef = useSyncRefs(ref)

  let ourProps = { ref: groupRef }

  return (
    <PortalGroupContext.Provider value={target}>
      {render({
        ourProps,
        theirProps,
        defaultTag: DEFAULT_GROUP_TAG,
        name: 'Popover.Group',
      })}
    </PortalGroupContext.Provider>
  )
}

// ---

let PortalParentContext = createContext<{
  register: (portal: HTMLElement) => () => void
  unregister: (portal: HTMLElement) => void
  portals: MutableRefObject<HTMLElement[]>
} | null>(null)

export function useNestedPortals() {
  let parent = useContext(PortalParentContext)
  let portals = useRef<HTMLElement[]>([])

  let register = useEvent((portal: HTMLElement) => {
    portals.current.push(portal)
    if (parent) parent.register(portal)
    return () => unregister(portal)
  })

  let unregister = useEvent((portal: HTMLElement) => {
    let idx = portals.current.indexOf(portal)
    if (idx !== -1) portals.current.splice(idx, 1)
    if (parent) parent.unregister(portal)
  })

  let api = useMemo<ContextType<typeof PortalParentContext>>(
    () => ({ register, unregister, portals }),
    [register, unregister, portals]
  )

  return [
    portals,
    useMemo(() => {
      return function PortalWrapper({ children }: { children: React.ReactNode }) {
        return <PortalParentContext.Provider value={api}>{children}</PortalParentContext.Provider>
      }
    }, [api]),
  ] as const
}

// ---

export interface _internal_ComponentPortal extends HasDisplayName {
  <TTag extends ElementType = typeof DEFAULT_PORTAL_TAG>(
    props: PortalProps<TTag> & RefProp<typeof PortalFn>
  ): JSX.Element
}

export interface _internal_ComponentPortalGroup extends HasDisplayName {
  <TTag extends ElementType = typeof DEFAULT_GROUP_TAG>(
    props: PortalGroupProps<TTag> & RefProp<typeof GroupFn>
  ): JSX.Element
}

let PortalRoot = forwardRefWithAs(PortalFn) as unknown as _internal_ComponentPortal
let Group = forwardRefWithAs(GroupFn) as unknown as _internal_ComponentPortalGroup

export let Portal = Object.assign(PortalRoot, { Group })
