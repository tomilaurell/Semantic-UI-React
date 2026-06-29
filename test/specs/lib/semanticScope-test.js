import {
  getSemanticScope,
  querySemanticScope,
  resolveSemanticMountNode,
} from 'src/lib/semanticScope'
import isBrowser from 'src/lib/isBrowser'

describe('semanticScope', () => {
  let outerScope
  let innerScope
  let target

  beforeEach(() => {
    outerScope = document.createElement('div')
    outerScope.className = 'semantic-scope'

    innerScope = document.createElement('div')
    innerScope.className = 'semantic-scope'

    target = document.createElement('button')
    target.className = 'target'

    innerScope.appendChild(target)
    outerScope.appendChild(innerScope)
    document.body.appendChild(outerScope)
  })

  afterEach(() => {
    document.body.removeChild(outerScope)
    isBrowser.override = null
  })

  it('finds the closest semantic scope', () => {
    getSemanticScope(target).should.equal(innerScope)
  })

  it('supports React ref objects', () => {
    getSemanticScope({ current: target }).should.equal(innerScope)
  })

  it('supports callback refs with current values', () => {
    const ref = () => {}
    ref.current = target

    getSemanticScope(ref).should.equal(innerScope)
  })

  it('returns explicit mountNode unchanged', () => {
    const explicitMountNode = document.createElement('div')

    resolveSemanticMountNode(explicitMountNode, target).should.equal(explicitMountNode)
  })

  it('resolves mountNode to a portal scope beside the closest semantic scope', () => {
    const mountNode = resolveSemanticMountNode(null, target)

    mountNode.should.not.equal(innerScope)
    mountNode.parentNode.should.equal(outerScope)
    mountNode.classList.contains('semantic-scope').should.equal(true)
    mountNode.dataset.suirPortalRoot.should.equal('true')
  })

  it('falls back to document.body when no semantic scope exists', () => {
    resolveSemanticMountNode(null, document.createElement('div')).should.equal(document.body)
  })

  it('queries inside the closest semantic scope', () => {
    const outerResult = document.createElement('div')
    const innerResult = document.createElement('div')

    outerResult.className = 'result'
    innerResult.className = 'result'

    outerScope.insertBefore(outerResult, innerScope)
    innerScope.appendChild(innerResult)

    querySemanticScope(target, '.result').should.equal(innerResult)
  })

  it('returns null when no browser environment exists', () => {
    isBrowser.override = false

    expect(getSemanticScope(target)).to.equal(null)
    expect(resolveSemanticMountNode(null, target)).to.equal(null)
    expect(querySemanticScope(target, '.target')).to.equal(null)
  })
})
