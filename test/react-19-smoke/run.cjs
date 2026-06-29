const childProcess = require('child_process')
const fs = require('fs')
const http = require('http')
const net = require('net')
const os = require('os')
const path = require('path')

const puppeteer = require('puppeteer')

const sourceDir = __dirname
const rootDir = path.resolve(sourceDir, '../..')
const runtimeDir = path.join(os.tmpdir(), 'semantic-ui-react-react19-smoke')
const packedDir = path.join(runtimeDir, '.packed')

function copyDirectory(source, destination) {
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

function run(command, args, options = {}) {
  childProcess.execFileSync(command, args, {
    cwd: runtimeDir,
    env: process.env,
    stdio: 'inherit',
    ...options,
  })
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()

      server.close(() => resolve(port))
    })
  })
}

function waitForServer(url, timeout = 30000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    function attempt() {
      const request = http.get(url, (response) => {
        response.resume()
        resolve()
      })

      request.on('error', () => {
        if (Date.now() - startedAt > timeout) {
          reject(new Error(`Timed out waiting for ${url}`))
          return
        }

        setTimeout(attempt, 250)
      })
    }

    attempt()
  })
}

async function main() {
  fs.rmSync(runtimeDir, { force: true, recursive: true })
  fs.mkdirSync(runtimeDir, { recursive: true })
  fs.copyFileSync(path.join(sourceDir, 'index.html'), path.join(runtimeDir, 'index.html'))
  fs.copyFileSync(path.join(sourceDir, 'package.json'), path.join(runtimeDir, 'package.json'))
  copyDirectory(path.join(sourceDir, 'src'), path.join(runtimeDir, 'src'))

  run('npm', [
    'install',
    '--no-package-lock',
    '--legacy-peer-deps',
    '--no-audit',
    '--fund=false',
  ])
  fs.rmSync(packedDir, { force: true, recursive: true })
  fs.mkdirSync(packedDir, { recursive: true })

  childProcess.execFileSync('npm', ['pack', rootDir, '--pack-destination', packedDir, '--silent'], {
    cwd: runtimeDir,
    env: process.env,
    stdio: 'pipe',
  })

  const packagePath = fs
    .readdirSync(packedDir)
    .find((filename) => /^semantic-ui-react-.*\.tgz$/.test(filename))

  if (!packagePath) {
    throw new Error('Could not find packed semantic-ui-react tarball')
  }

  run('npm', [
    'install',
    '--no-package-lock',
    '--legacy-peer-deps',
    '--no-audit',
    '--fund=false',
    '--no-save',
    path.join(packedDir, packagePath),
  ])
  run('npm', ['run', 'build'])

  const port = await getFreePort()
  const viteBin = path.join(runtimeDir, 'node_modules/.bin/vite')
  const server = childProcess.spawn(
    viteBin,
    ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: runtimeDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  server.stdout.on('data', (chunk) => process.stdout.write(chunk))
  server.stderr.on('data', (chunk) => process.stderr.write(chunk))

  const url = `http://127.0.0.1:${port}/`

  try {
    await waitForServer(url)

    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    const consoleMessages = []
    const failedResponses = []
    const pageErrors = []

    page.on('console', (message) => {
      if (message.type() === 'warning' || message.type() === 'error') {
        if (message.text() === 'Failed to load resource: the server responded with a status of 404 (Not Found)') {
          return
        }

        consoleMessages.push(`${message.type()}: ${message.text()}`)
      }
    })
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
        failedResponses.push(`${response.status()}: ${response.url()}`)
      }
    })
    page.on('pageerror', (error) => pageErrors.push(error.stack || error.message))

    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForFunction(() => window.__SUIR_REACT19_SMOKE_DONE__ === true, {
      timeout: 10000,
    })

    const smokeResult = await page.evaluate(() => window.__SUIR_REACT19_SMOKE__)

    await browser.close()

    const failures = [
      ...(smokeResult?.messages || []),
      ...(smokeResult?.error ? [smokeResult.error] : []),
      ...consoleMessages,
      ...failedResponses,
      ...pageErrors,
    ]

    if (failures.length > 0) {
      throw new Error(`React 19 smoke failed:\n${failures.join('\n')}`)
    }
  } finally {
    server.kill('SIGTERM')
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
