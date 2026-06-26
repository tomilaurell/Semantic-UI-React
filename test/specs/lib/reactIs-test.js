import * as React from 'react'

import {
  getElementRef,
  isForwardRef,
  isFragment,
  isValidElementType,
  TransitionalElement,
} from 'src/lib/reactIs'

describe('reactIs', () => {
  describe('getElementRef', () => {
    it('reads refs from React 19 element props without accessing element.ref', () => {
      const ref = () => null
      const element = {
        $$typeof: TransitionalElement,
        props: { ref },
      }

      Object.defineProperty(element, 'ref', {
        get() {
          throw new Error('element.ref should not be read')
        },
      })

      getElementRef(element).should.equal(ref)
    })
  })

  describe('isForwardRef', () => {
    it('detects React.forwardRef elements', () => {
      const Component = React.forwardRef((props, ref) => <div {...props} ref={ref} />)

      isForwardRef(<Component />).should.equal(true)
    })
  })

  describe('isFragment', () => {
    it('detects React.Fragment elements', () => {
      isFragment(<></>).should.equal(true)
    })
  })

  describe('isValidElementType', () => {
    it('accepts host elements and function components', () => {
      function Component() {
        return null
      }

      isValidElementType('div').should.equal(true)
      isValidElementType(Component).should.equal(true)
    })
  })
})
