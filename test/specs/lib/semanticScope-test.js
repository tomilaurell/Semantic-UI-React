import {
  getSemanticScope,
  querySemanticScope,
  resolveSemanticMountNode,
} from 'src/lib/semanticScope'
import isBrowser from 'src/lib/isBrowser'

describe('semanticScope', () => {
  let appRoot
  let outerScope
  let innerScope
  let target

  beforeEach(() => {
    appRoot = document.createElement('div')
    appRoot.id = 'root'

    outerScope = document.createElement('div')
    outerScope.className = 'semantic-scope'

    innerScope = document.createElement('div')
    innerScope.className = 'semantic-scope'

    target = document.createElement('button')
    target.className = 'target'

    innerScope.appendChild(target)
    outerScope.appendChild(innerScope)
    appRoot.appendChild(outerScope)
    document.body.appendChild(appRoot)
  })

  afterEach(() => {
    document
      .querySelectorAll('[data-suir-portal-root="true"]')
      .forEach((portalRoot) => portalRoot.parentNode.removeChild(portalRoot))
    document.body.removeChild(appRoot)
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

  it('resolves mountNode to a portal scope beside the app root that contains the closest semantic scope', () => {
    const mountNode = resolveSemanticMountNode(null, target)

    mountNode.should.not.equal(innerScope)
    mountNode.parentNode.should.equal(document.body)
    appRoot.contains(mountNode).should.equal(false)
    appRoot.nextSibling.should.equal(mountNode)
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
