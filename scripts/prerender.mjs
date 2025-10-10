import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distDir = path.resolve(__dirname, '../dist')
const serverEntry = pathToFileURL(path.resolve(distDir, 'server/entry-server.js')).href

const templatePath = path.resolve(distDir, 'index.html')
const template = await readFile(templatePath, 'utf-8')

const { render } = await import(serverEntry)
const appHtml = render()

const html = template.replace('<!--app-html-->', appHtml)

await writeFile(templatePath, html)

console.log('Pre-rendered index.html with SSR markup.')
