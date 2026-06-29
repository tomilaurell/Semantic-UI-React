import isBrowser from './isBrowser'

export const semanticScopeClassName = 'semantic-scope'
export const semanticPortalRootAttribute = 'data-suir-portal-root'

const semanticPortalRoots = typeof WeakMap === 'function' ? new WeakMap() : null

function getNode(node) {
  return node && Object.prototype.hasOwnProperty.call(node, 'current') ? node.current : node
}

function getSemanticPortalHost(scope) {
  let host = scope

  while (host.parentElement && host.parentElement !== document.body) {
    host = host.parentElement
  }

  return host
}

function getSemanticPortalRoot(scope, scopeClassName = semanticScopeClassName) {
  if (!scope?.parentNode) {
    return scope
  }

  const portalHost = getSemanticPortalHost(scope)
  const portalParent = portalHost.parentNode

  if (!portalParent) {
    return scope
  }

  const existingPortalRoot = semanticPortalRoots?.get(portalHost)

  if (existingPortalRoot?.parentNode === portalParent) {
    return existingPortalRoot
  }

  const newPortalRoot = document.createElement('div')
  newPortalRoot.className = scopeClassName
  newPortalRoot.setAttribute(semanticPortalRootAttribute, 'true')
  portalParent.insertBefore(newPortalRoot, portalHost.nextSibling)
  semanticPortalRoots?.set(portalHost, newPortalRoot)

  return newPortalRoot
}

export function getSemanticScope(node, scopeClassName = semanticScopeClassName) {
  const element = getNode(node)

  if (!isBrowser() || !element || typeof element.closest !== 'function') {
    return null
  }

  return element.closest(`.${scopeClassName}`)
}

export function resolveSemanticMountNode(
  explicitMountNode,
  fallbackNode,
  scopeClassName = semanticScopeClassName,
) {
  if (explicitMountNode) {
    return explicitMountNode
  }

  if (!isBrowser()) {
    return null
  }

  const scope = getSemanticScope(fallbackNode, scopeClassName)

  return scope ? getSemanticPortalRoot(scope, scopeClassName) : document.body
}

export function querySemanticScope(node, selector, scopeClassName = semanticScopeClassName) {
  const element = getNode(node)

  if (!isBrowser()) {
    return null
  }

  if (element && typeof element.querySelector === 'function') {
    const scopedResult = element.querySelector(selector)

    if (scopedResult) {
      return scopedResult
    }
  }

  const scope = getSemanticScope(element, scopeClassName)
  const root = scope || element || document

  return typeof root?.querySelector === 'function' ? root.querySelector(selector) : null
}
