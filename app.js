import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import basicAuth from 'express-basic-auth'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const prisma = new PrismaClient()

const PORT = Number(process.env.PORT) || 3000
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`
const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

app.get('/salud', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) })
  }
})

function validarUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}
function generarSlug(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

app.post('/api/links', async (req, res) => {
  const { urlOriginal, slug } = req.body || {}
  if (!validarUrl(urlOriginal)) return res.status(400).json({ error: 'URL inválida' })

  let finalSlug = (slug || generarSlug()).toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (finalSlug.length < 3) finalSlug = generarSlug()

  try {
    const link = await prisma.link.create({ data: { urlOriginal, slug: finalSlug } })
    res.status(201).json({ id: link.id, slug: link.slug, urlOriginal: link.urlOriginal, shortUrl: `${BASE_URL}/${link.slug}` })
  } catch (e) {
    if (String(e).includes('Unique constraint')) return res.status(409).json({ error: 'Slug ya existe' })
    res.status(500).json({ error: 'Error creando el link' })
  }
})

app.get('/:slug', async (req, res, next) => {
  const { slug } = req.params
  if (slug === 'admin' || slug.startsWith('api')) return next()
  const link = await prisma.link.findUnique({ where: { slug } })
  if (!link) return res.status(404).send('No encontrado')
  const referer = req.get('referer') || null
  const userAgent = req.get('user-agent') || null
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || null
  prisma.click.create({ data: { linkId: link.id, referer, userAgent, ip } }).catch(() => {})
  res.redirect(302, link.urlOriginal)
})

const adminAuth = basicAuth({ users: { [ADMIN_USER]: ADMIN_PASS }, challenge: true, realm: 'CortoLink Admin' })
app.get('/admin', adminAuth, (req, res) => { res.render('admin') })

app.get('/api/admin/links', adminAuth, async (_req, res) => {
  const links = await prisma.link.findMany({ orderBy: { creadoEn: 'desc' }, include: { _count: { select: { clics: true } } } })
  res.json(links.map(l => ({ id: l.id, slug: l.slug, urlOriginal: l.urlOriginal, creadoEn: l.creadoEn, totalClicks: l._count.clics })))
})
app.get('/api/admin/links/:id/stats', adminAuth, async (req, res) => {
  const id = Number(req.params.id)
  const clicks = await prisma.click.findMany({ where: { linkId: id }, orderBy: { ts: 'desc' }, take: 200 })
  res.json(clicks)
})
app.delete('/api/admin/links/:id', adminAuth, async (req, res) => {
  const id = Number(req.params.id)
  try { await prisma.link.delete({ where: { id } }); res.status(204).send() }
  catch { res.status(404).json({ error: 'No encontrado' }) }
})

app.listen(PORT, () => console.log(`CortoLink en http://localhost:${PORT}`))
