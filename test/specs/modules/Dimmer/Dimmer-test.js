import React from 'react'

import Portal from 'src/addons/Portal/Portal'
import Dimmer from 'src/modules/Dimmer/Dimmer'
import DimmerDimmable from 'src/modules/Dimmer/DimmerDimmable'
import DimmerInner from 'src/modules/Dimmer/DimmerInner'
import * as common from 'test/specs/commonTests'

describe('Dimmer', () => {
  common.isConformant(Dimmer)
  common.forwardsRef(Dimmer)
  common.hasSubcomponents(Dimmer, [DimmerDimmable, DimmerInner])

  common.implementsCreateMethod(Dimmer)

  describe('children', () => {
    it('renders a DimmerInner', () => {
      shallow(<Dimmer />)
        .type()
        .should.equal(DimmerInner)
    })
  })

  describe('page', () => {
    it('renders a Portal', () => {
      shallow(<Dimmer page />)
        .type()
        .should.equal(Portal)
    })

    describe('active', () => {
      beforeEach(() => {
        document.body.classList.remove('dimmable', 'dimmed')
      })

      it('when true, Portal is opened dimmer classes are present on body', () => {
        const dimmer = mount(<Dimmer page active />)
        const classes = document.body.classList

        dimmer.find(Portal).should.have.prop('open', true)

        classes.contains('dimmable').should.be.true()
        classes.contains('dimmed').should.be.true()
      })

      it('when false, Portal is closed dimmer classes are absent on body', () => {
        const dimmer = mount(<Dimmer page active={false} />)
        const classes = document.body.classList

        dimmer.find(Portal).should.have.prop('open', false)

        classes.contains('dimmable').should.be.false()
        classes.contains('dimmed').should.be.false()
      })

      it('when changed to false, dimmer classes are removed from body', () => {
        const dimmer = mount(<Dimmer page active />)
        const classes = document.body.classList

        dimmer.setProps({ active: false })

        classes.contains('dimmable').should.be.false()
        classes.contains('dimmed').should.be.false()
      })

      it('when mounted in semantic scope, dimmer classes are scoped', (done) => {
        const scope = document.createElement('div')
        scope.className = 'semantic-scope'
        document.body.appendChild(scope)

        const dimmer = mount(<Dimmer page active />, { attachTo: scope })

        setTimeout(() => {
          try {
            dimmer.find(Portal).should.have.prop('open', true)

            scope.classList.contains('dimmable').should.be.true()
            scope.classList.contains('dimmed').should.be.true()
            document.body.classList.contains('dimmable').should.be.false()
            document.body.classList.contains('dimmed').should.be.false()
            scope.querySelector('.ui.dimmer').should.not.equal(null)
            done()
          } catch (err) {
            done(err)
          } finally {
            dimmer.unmount()
            document.body.removeChild(scope)
          }
        })
      })
    })
  })
})
