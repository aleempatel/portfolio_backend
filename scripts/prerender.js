/* Server-side render ("prerender") of the portfolio.
 *
 *   npm run prerender
 *
 * Reads the portfolio data straight from MongoDB, runs the frontend's own render code (js/render.js) inside
 * jsdom, and writes the finished HTML back into <frontend>/index.html. Crawlers, link previews and visitors
 * without JavaScript therefore get the real content, and the page no longer jumps when the API answers.
 * It also refreshes the <meta> description, Open Graph tags, Person JSON-LD, sitemap.xml and robots.txt.
 *
 * Re-run it after you change content in the admin panel (or put it in your deploy step / a cron job).
 *
 * Options (env or flags):
 *   FRONTEND_DIR / --frontend <dir>   folder that holds index.html (default: ../../frontend, next to this backend)
 *   SITE_URL / --site <url>           public URL of the site, used for canonical, og:url, sitemap (default https://aleempatel.dev)
 *   --data <file.json>                skip MongoDB and use { profile, skills, projects, education, courses, experience } from a file
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const arg = (name) => { const i = process.argv.indexOf('--' + name); return i > -1 ? process.argv[i + 1] : undefined; };
const FRONTEND_DIR = path.resolve(arg('frontend') || process.env.FRONTEND_DIR || path.join(__dirname, '..', '..', 'frontend'));
const SITE_URL = (arg('site') || process.env.SITE_URL || 'https://aleempatel.dev').replace(/\/+$/, '');

async function loadData() {
  if (arg('data')) return JSON.parse(fs.readFileSync(arg('data'), 'utf8'));
  const mongoose = require('mongoose');
  const connectDB = require('../src/config/db');
  await connectDB();
  const sorted = (M) => M.find().sort({ order: 1, createdAt: 1 }).lean();
  const data = {
    profile: (await require('../src/models/Profile').findOne().lean()) || {},
    skills: await sorted(require('../src/models/Skill')),
    projects: await sorted(require('../src/models/Project')),
    education: await sorted(require('../src/models/Education')),
    courses: await sorted(require('../src/models/Course')),
    experience: await sorted(require('../src/models/Experience')),
  };
  await mongoose.disconnect();
  return JSON.parse(JSON.stringify(data)); // ObjectIds / Dates -> plain strings
}

const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t; };

function prerender(html, data) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: SITE_URL + '/' });
  const { window } = dom, { document } = window;
  const ctx = dom.getInternalVMContext();
  const run = (code, name) => vm.runInContext(code, ctx, { filename: name });

  // Browser-only pieces that render.js expects from projects.js / ui.js.
  const projectsSrc = fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'projects.js'), 'utf8');
  const pic = (projectsSrc.match(/const PIC='([^']*)'/) || [])[1] || '';
  run('let DECKS = []; const PIC = ' + JSON.stringify(pic) + '; function initStack() {}', 'prerender-stubs.js');
  run(fs.readFileSync(path.join(FRONTEND_DIR, 'js', 'render.js'), 'utf8'), 'render.js');
  window.__DATA__ = data;
  const rendered = run('renderAll(__DATA__)', 'prerender-run.js');
  if (!rendered) throw new Error('Database is empty (no name, skills or projects) - nothing to prerender.');

  // Counters: show the real numbers in the HTML (the browser animates them from 0 again).
  document.querySelectorAll('.stats [data-k]').forEach((el) => { el.textContent = el.dataset.n || '0'; });

  // ---- head: description, social tags, canonical, JSON-LD ----
  const p = data.profile || {};
  const setMeta = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val); };
  const title = document.title;
  const desc = clip(p.bio || p.aboutBio, 158);
  setMeta('meta[name="description"]', 'content', desc);
  setMeta('meta[property="og:title"]', 'content', title); setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', desc); setMeta('meta[name="twitter:description"]', 'content', desc);
  setMeta('link[rel="canonical"]', 'href', SITE_URL + '/'); setMeta('meta[property="og:url"]', 'content', SITE_URL + '/');
  if (p.name) setMeta('meta[name="author"]', 'content', p.name);
  const img = /^https?:\/\//.test(p.profilePicture || '') ? p.profilePicture : SITE_URL + '/favicon.png';
  setMeta('meta[property="og:image"]', 'content', img); setMeta('meta[name="twitter:image"]', 'content', img);
  const ld = document.getElementById('ldPerson');
  if (ld) {
    const same = [p.github, p.linkedin, p.twitter, p.website].filter((u) => /^https?:\/\//i.test(u || ''));
    const person = { '@context': 'https://schema.org', '@type': 'Person', name: p.name, jobTitle: p.title || (p.roles || []).join(' | '), url: SITE_URL + '/', image: img };
    if (desc) person.description = desc;
    if (same.length) person.sameAs = same;
    ld.textContent = JSON.stringify(person).replace(/</g, '\\u003c');
  }
  return dom.serialize();
}

function writeSeoFiles() {
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(FRONTEND_DIR, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>' + SITE_URL + '/</loc>\n    <lastmod>' + today + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n');
  fs.writeFileSync(path.join(FRONTEND_DIR, 'robots.txt'), 'User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ' + SITE_URL + '/sitemap.xml\n');
}

(async () => {
  const data = await loadData();
  const file = path.join(FRONTEND_DIR, 'index.html');
  const out = prerender(fs.readFileSync(file, 'utf8'), data);
  fs.writeFileSync(file, out);
  writeSeoFiles();
  console.log('Prerendered ' + file + ' (' + Math.round(out.length / 1024) + ' KB) for ' + SITE_URL);
})().catch((e) => { console.error('Prerender failed:', e.message); process.exit(1); });
