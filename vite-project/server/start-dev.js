import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const concurrentlyCli = resolve(root, 'node_modules/concurrently/dist/bin/index.js')
const requestedPort = Number(process.env.PORT || 3001)

async function isPortAvailable(port) {
  const probe = createServer()

  return new Promise((resolvePort, reject) => {
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolvePort(false)
      } else {
        reject(error)
      }
    })
    probe.listen(port, '127.0.0.1', () => {
      probe.close((error) => {
        if (error) reject(error)
        else resolvePort(true)
      })
    })
  })
}

if (!Number.isInteger(requestedPort) || requestedPort < 1 || requestedPort > 65535) {
  throw new Error('PORT qiymati 1 va 65535 oralig‘idagi butun son bo‘lishi kerak.')
}

let apiPort = requestedPort
while (apiPort <= 65535 && !(await isPortAvailable(apiPort))) {
  apiPort += 1
}

if (apiPort > 65535) {
  throw new Error(`${requestedPort}-portdan boshlab bo‘sh port topilmadi.`)
}

if (apiPort !== requestedPort) {
  console.log(`${requestedPort}-port band; API server ${apiPort}-portda ishga tushadi.`)
}

const devProcesses = spawn(
  process.execPath,
  [concurrentlyCli, '-k', 'npm run dev:server', 'vite'],
  {
    cwd: root,
    env: { ...process.env, PORT: String(apiPort) },
    stdio: 'inherit',
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => devProcesses.kill(signal))
}

devProcesses.once('error', (error) => {
  console.error('Lokal serverlarni ishga tushirib bo‘lmadi:', error)
  process.exitCode = 1
})

devProcesses.once('close', (code) => {
  process.exitCode = code ?? 1
})
