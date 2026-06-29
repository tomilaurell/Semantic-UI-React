import isBrowser from './isBrowser'

export const semanticScopeClassName = 'semantic-scope'

function getNode(node) {
  return node && Object.prototype.hasOwnProperty.call(node, 'current') ? node.current : node
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

  return getSemanticScope(fallbackNode, scopeClassName) || (isBrowser() ? document.body : null)
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
