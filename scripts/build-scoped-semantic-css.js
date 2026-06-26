/* eslint-disable no-console, no-param-reassign */

const CleanCSS = require('clean-css')
const fs = require('fs')
const path = require('path')
const postcss = require('postcss')
const selectorParser = require('postcss-selector-parser')

const rootDir = path.resolve(__dirname, '..')
const sourceCssPath = path.join(rootDir, 'node_modules/semantic-ui-css/semantic.css')
const sourceFontDir = path.join(rootDir, 'node_modules/semantic-ui-css/themes/default/assets/fonts')
const outputDir = path.join(rootDir, 'dist/css')
const outputCssPath = path.join(outputDir, 'semantic-ui-scoped.css')
const outputMinCssPath = path.join(outputDir, 'semantic-ui-scoped.min.css')
const outputFontDir = path.join(outputDir, 'themes/default/assets/fonts')
const scopeClassName = 'semantic-scope'

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

function isCombinator(node) {
  return node.type === 'combinator'
}

function isRootTag(node) {
  return node.type === 'tag' && /^(html|body)$/i.test(node.value)
}

function isRootPseudo(node) {
  return node.type === 'pseudo' && node.value === ':root'
}

function isSemanticScopeClass(node) {
  return node.type === 'class' && node.value === scopeClassName
}

function firstNonCombinator(selector) {
  return selector.nodes.find((node) => !isCombinator(node))
}

function removeNode(selector, index) {
  selector.nodes[index].remove()
}

function removeLeadingBodyAfterHtml(selector) {
  let index = 1

  while (selector.nodes[index] && isCombinator(selector.nodes[index])) {
    index += 1
  }

  if (selector.nodes[index] && isRootTag(selector.nodes[index])) {
    let previousIndex = index - 1

    while (selector.nodes[previousIndex] && isCombinator(selector.nodes[previousIndex])) {
      removeNode(selector, previousIndex)
      previousIndex -= 1
      index -= 1
    }

    removeNode(selector, index)
  }
}

function replaceRootSelector(selector, node) {
  node.replaceWith(selectorParser.className({ value: scopeClassName }))
  removeLeadingBodyAfterHtml(selector)
}

function prefixSelector(selector) {
  selector.prepend(selectorParser.combinator({ value: ' ' }))
  selector.prepend(selectorParser.className({ value: scopeClassName }))
}

function transformSelector(selector) {
  const first = firstNonCombinator(selector)

  if (!first || isSemanticScopeClass(first)) {
    return
  }

  if (isRootTag(first) || isRootPseudo(first)) {
    replaceRootSelector(selector, first)
    return
  }

  prefixSelector(selector)
}

function scopeSelectors(selector) {
  return selectorParser((selectors) => {
    selectors.each(transformSelector)
  }).processSync(selector)
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    return
  }

  fs.mkdirSync(destination, { recursive: true })

  fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(source, entry.name)
    const destinationPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath)
      return
    }

    fs.copyFileSync(sourcePath, destinationPath)
  })
}

function build() {
  const sourceCss = fs.readFileSync(sourceCssPath, 'utf8')
  const root = postcss.parse(sourceCss, { from: sourceCssPath })

  root.walkRules((rule) => {
    if (isKeyframesRule(rule)) {
      return
    }

    rule.selector = scopeSelectors(rule.selector)
  })

  const css = root.toResult({ to: outputCssPath }).css
  const minified = new CleanCSS({ level: 2 }).minify(css)

  if (minified.errors.length > 0) {
    throw new Error(minified.errors.join('\n'))
  }

  fs.mkdirSync(outputDir, { recursive: true })
  fs.writeFileSync(outputCssPath, css)
  fs.writeFileSync(outputMinCssPath, minified.styles)
  copyDirectory(sourceFontDir, outputFontDir)

  console.log(`Generated ${path.relative(rootDir, outputCssPath)}`)
  console.log(`Generated ${path.relative(rootDir, outputMinCssPath)}`)
}

build()
