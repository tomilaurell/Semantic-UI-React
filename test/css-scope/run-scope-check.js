/* eslint-disable no-console */

const path = require('path')
const fs = require('fs')
const os = require('os')
const { pathToFileURL } = require('url')

const puppeteer = require('puppeteer')

const rootDir = path.resolve(__dirname, '../..')
const cssPath = path.join(rootDir, 'dist/css/semantic-ui-scoped.css')
const cssUrl = pathToFileURL(cssPath).href
const fixtureHtmlPath = path.join(os.tmpdir(), 'semantic-ui-react-css-scope.html')

const properties = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'color',
  'backgroundColor',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'boxSizing',
  'display',
]

function createFixtureHtml() {
  return `
    <!doctype html>
    <html>
      <head>
        <style>
          .chatcnn-root {
            color: rgb(12, 34, 56);
            font-family: Arial, sans-serif;
            font-size: 13px;
            line-height: 19px;
          }
        </style>
      </head>
      <body>
        <main class="chatcnn-root">
          <div class="outside-probe" id="outside-div">Outside div</div>
          <button class="outside-probe" id="outside-button">Outside button</button>
          <input class="outside-probe" id="outside-input" value="Outside input" />
          <a class="outside-probe" id="outside-link" href="/">Outside link</a>
          <h1 class="outside-probe" id="outside-heading">Outside heading</h1>
          <button class="outside-probe ui primary button" id="outside-ui-button">
            Outside UI class
          </button>
        </main>

        <section class="semantic-scope" id="semantic-area">
          <button class="ui primary button" id="inside-button">Inside button</button>
          <div class="ui input">
            <input id="inside-input" value="Inside input" />
          </div>
          <i class="check icon" id="inside-icon"></i>
        </section>
      </body>
    </html>
  `
}

async function collectOutsideStyles(page) {
  return page.evaluate((trackedProperties) => {
    return Array.from(document.querySelectorAll('.outside-probe')).map((element) => {
      const computed = window.getComputedStyle(element)
      const values = {}

      trackedProperties.forEach((property) => {
        values[property] = computed[property]
      })

      return {
        id: element.id,
        values,
      }
    })
  }, properties)
}

async function collectInsideStyles(page) {
  return page.evaluate(() => {
    const button = window.getComputedStyle(document.getElementById('inside-button'))
    const input = window.getComputedStyle(document.getElementById('inside-input'))
    const icon = window.getComputedStyle(document.getElementById('inside-icon'))

    return {
      button: {
        backgroundColor: button.backgroundColor,
        borderRadius: button.borderRadius,
        color: button.color,
        display: button.display,
        fontFamily: button.fontFamily,
      },
      input: {
        boxSizing: input.boxSizing,
        fontFamily: input.fontFamily,
      },
      icon: {
        fontFamily: icon.fontFamily,
      },
    }
  })
}

async function loadStylesheet(page) {
  await page.evaluate((href) => {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link')

      link.href = href
      link.rel = 'stylesheet'
      link.onload = resolve
      link.onerror = () => reject(new Error(`Failed to load ${href}`))

      document.head.appendChild(link)
    })
  }, cssUrl)
}

function compareOutsideStyles(before, after) {
  const failures = []

  before.forEach((beforeEntry) => {
    const afterEntry = after.find((entry) => entry.id === beforeEntry.id)

    properties.forEach((property) => {
      if (beforeEntry.values[property] !== afterEntry.values[property]) {
        failures.push(
          `${beforeEntry.id}.${property}: expected "${beforeEntry.values[property]}", got "${afterEntry.values[property]}"`,
        )
      }
    })
  })

  return failures
}

function verifyInsideStyles(inside) {
  const failures = []

  if (!inside.button.fontFamily.toLowerCase().includes('lato')) {
    failures.push(`inside button did not receive Semantic font: ${inside.button.fontFamily}`)
  }

  if (inside.button.backgroundColor === 'rgba(0, 0, 0, 0)') {
    failures.push('inside button did not receive Semantic background')
  }

  if (inside.button.borderRadius === '0px') {
    failures.push(
      `inside button did not receive Semantic border radius: ${inside.button.borderRadius}`,
    )
  }

  if (inside.input.boxSizing !== 'border-box') {
    failures.push(`inside input did not receive Semantic box sizing: ${inside.input.boxSizing}`)
  }

  if (!inside.icon.fontFamily.toLowerCase().includes('icons')) {
    failures.push(`inside icon did not receive Semantic icon font: ${inside.icon.fontFamily}`)
  }

  return failures
}

async function main() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage()

  fs.writeFileSync(fixtureHtmlPath, createFixtureHtml())
  await page.goto(pathToFileURL(fixtureHtmlPath).href, { waitUntil: 'load' })

  const beforeOutside = await collectOutsideStyles(page)

  await loadStylesheet(page)
  await page.waitForTimeout(250)

  const afterOutside = await collectOutsideStyles(page)
  const inside = await collectInsideStyles(page)

  await browser.close()

  const failures = [
    ...compareOutsideStyles(beforeOutside, afterOutside),
    ...verifyInsideStyles(inside),
  ]

  if (failures.length > 0) {
    throw new Error(`CSS scope check failed:\n${failures.join('\n')}`)
  }

  console.log('Verified scoped CSS does not leak outside .semantic-scope')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
