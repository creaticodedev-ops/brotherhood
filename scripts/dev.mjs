// Runs the API (server/) and the website (client/) together for local development.
import { spawn } from 'node:child_process'

const tasks = [
  { name: 'api', color: 32, prefix: 'server' },
  { name: 'web', color: 37, prefix: 'client' },
]

const children = tasks.map(({ name, color, prefix }) => {
  const child = spawn(`npm run dev --prefix ${prefix}`, { shell: true, env: process.env })
  const tag = `\x1b[${color}m[${name}]\x1b[0m `
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) out.write(`${tag}${line}\n`)
    })
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  child.on('exit', (code) => {
    console.log(`${tag}exited with code ${code}`)
    stop(code ?? 0)
  })
  return child
})

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const child of children) if (child.exitCode === null) child.kill()
  setTimeout(() => process.exit(code), 300)
}

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
