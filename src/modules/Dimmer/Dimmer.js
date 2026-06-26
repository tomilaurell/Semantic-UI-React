import PropTypes from 'prop-types'
import * as React from 'react'

import {
  createShorthandFactory,
  getUnhandledProps,
  useClassNamesOnNode,
  useIsomorphicLayoutEffect,
  useMergedRefs,
} from '../../lib'
import Portal from '../../addons/Portal'
import DimmerDimmable from './DimmerDimmable'
import DimmerInner from './DimmerInner'

const PageDimmer = React.forwardRef(function (props, ref) {
  const elementRef = useMergedRefs(ref, React.useRef())
  const [classNode, setClassNode] = React.useState(null)

  useIsomorphicLayoutEffect(() => {
    setClassNode(elementRef.current?.parentElement || null)
  })

  useClassNamesOnNode(classNode, 'dimmed dimmable')

  return <DimmerInner {...props} ref={elementRef} />
})

/**
 * A dimmer hides distractions to focus attention on particular content.
 */
const Dimmer = React.forwardRef(function (props, ref) {
  const { active, page } = props
  const rest = getUnhandledProps(Dimmer, props)

  if (page) {
    return (
      <Portal
        closeOnEscape={false}
        closeOnDocumentClick={false}
        open={active}
        openOnTriggerClick={false}
      >
        <PageDimmer {...rest} active={active} page={page} ref={ref} />
      </Portal>
    )
  }

  return <DimmerInner {...rest} active={active} page={page} ref={ref} />
})

Dimmer.displayName = 'Dimmer'
Dimmer.propTypes = {
  /** An active dimmer will dim its parent container. */
  active: PropTypes.bool,

  /** A dimmer can be formatted to be fixed to the page. */
  page: PropTypes.bool,
}

Dimmer.Dimmable = DimmerDimmable
Dimmer.Inner = DimmerInner

Dimmer.create = createShorthandFactory(Dimmer, (value) => ({ content: value }))

export default Dimmer
