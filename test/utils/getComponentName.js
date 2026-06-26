import { ForwardRef, Memo } from 'src/lib/reactIs'

/**
 * Gets a proper `displayName` for a component.
 *
 * @param {React.ElementType} Component
 * @return {String}
 */
export default function getComponentName(Component) {
  if (Component.$$typeof === Memo) {
    return getComponentName(Component.type)
  }

  if (Component.$$typeof === ForwardRef) {
    return Component.displayName
  }

  return Component.prototype?.constructor?.name
}
