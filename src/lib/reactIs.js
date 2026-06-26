import * as React from 'react'

export const ForwardRef = Symbol.for('react.forward_ref')
export const Fragment = Symbol.for('react.fragment')
export const Memo = Symbol.for('react.memo')
export const TransitionalElement = Symbol.for('react.transitional.element')

const Lazy = Symbol.for('react.lazy')
const Provider = Symbol.for('react.provider')
const Context = Symbol.for('react.context')
const Consumer = Symbol.for('react.consumer')

export function isForwardRef(element) {
  return React.isValidElement(element) && element.type?.$$typeof === ForwardRef
}

export function isFragment(element) {
  return React.isValidElement(element) && element.type === React.Fragment
}

export function isValidElementType(type) {
  if (typeof type === 'string' || typeof type === 'function') {
    return true
  }

  if (
    type === React.Fragment ||
    type === React.Profiler ||
    type === React.StrictMode ||
    type === React.Suspense
  ) {
    return true
  }

  return (
    typeof type === 'object' &&
    type !== null &&
    (type.$$typeof === Lazy ||
      type.$$typeof === Memo ||
      type.$$typeof === Provider ||
      type.$$typeof === Context ||
      type.$$typeof === Consumer ||
      type.$$typeof === ForwardRef)
  )
}

export function getElementRef(element) {
  if (!element || typeof element !== 'object') {
    return undefined
  }

  if (element.$$typeof === TransitionalElement) {
    return element.props?.ref
  }

  if (!React.isValidElement(element)) {
    return undefined
  }

  return element.ref
}
