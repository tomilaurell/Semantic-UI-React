import React from 'react'

import ModalContent from 'src/modules/Modal/ModalContent'
import * as common from 'test/specs/commonTests'

describe('ModalContent', () => {
  common.isConformant(ModalContent)
  common.forwardsRef(ModalContent)
  common.rendersChildren(ModalContent)

  common.implementsCreateMethod(ModalContent)

  common.propKeyOnlyToClassName(ModalContent, 'image')
  common.propKeyOnlyToClassName(ModalContent, 'scrolling')

  it('does not set overflow by default', () => {
    const wrapper = mount(<ModalContent />)

    wrapper.getDOMNode().style.overflow.should.equal('')
  })
})
