/* eslint-disable no-console */

const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const selectorParser = require('postcss-selector-parser')

const rootDir = path.resolve(__dirname, '..')
const cssPath = path.join(rootDir, 'dist/css/semantic-ui-scoped.css')
const scopeClassName = 'semantic-scope'
const forbiddenRootTags = new Set(['html', 'body'])
const forbiddenGlobalFontFamilies = [
  'Icons',
  'outline-icons',
  'brand-icons',
  'Step',
  'Accordion',
  'Checkbox',
  'Dropdown',
  'Rating',
]

function isKeyframesRule(rule) {
  let parent = rule.parent

  while (parent) {
    if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) {
      return true
    }

    parent = parent.parent
  }

  return false
}

function firstNonCombinator(selector) {
  return selector.nodes.find((node) => node.type !== 'combinator')
}

function selectorStartsWithScope(selector) {
  const first = firstNonCombinator(selector)

  return first?.type === 'class' && first.value === scopeClassName
}

function isInsidePseudo(node) {
  let parent = node.parent

  while (parent) {
    if (parent.type === 'pseudo') {
      return true
    }

    parent = parent.parent
  }

  return false
}

function selectorContainsForbiddenRootTag(selector) {
  let containsForbiddenRootTag = false

  selector.walkTags((tag) => {
    if (!isInsidePseudo(tag) && forbiddenRootTags.has(tag.value.toLowerCase())) {
      containsForbiddenRootTag = true
    }
  })

  return containsForbiddenRootTag
}

function verifySelector(selectorText, failures) {
  selectorParser((selectors) => {
    selectors.each((selector) => {
      if (!selectorStartsWithScope(selector)) {
        failures.push(`Unscoped selector: ${selector.toString()}`)
      }

      if (selectorContainsForbiddenRootTag(selector)) {
        failures.push(`Forbidden html/body selector: ${selector.toString()}`)
      }
    })
  }).processSync(selectorText)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsFontFamilyName(value, fontFamily) {
  const escapedFontFamily = escapeRegExp(fontFamily)

  return new RegExp(`(^|[\\s,'"])${escapedFontFamily}($|[\\s,'"])`).test(value)
}

function verify() {
  const css = fs.readFileSync(cssPath, 'utf8')
  const root = postcss.parse(css, { from: cssPath })
  const failures = []

  root.walkAtRules('import', (atRule) => {
    failures.push(`Global @import is not scoped: @import ${atRule.params}`)
  })

  root.walkRules((rule) => {
    if (!isKeyframesRule(rule)) {
      verifySelector(rule.selector, failures)
    }
  })

  root.walkDecls(/font-family/i, (declaration) => {
    forbiddenGlobalFontFamilies.forEach((fontFamily) => {
      if (containsFontFamilyName(declaration.value, fontFamily)) {
        failures.push(`Unscoped Semantic font family "${fontFamily}" in: ${declaration.toString()}`)
      }
    })
  })

  if (failures.length > 0) {
    throw new Error(`Scoped CSS verification failed:\n${failures.slice(0, 50).join('\n')}`)
  }

  console.log(`Verified ${path.relative(rootDir, cssPath)}`)
}

verify()
