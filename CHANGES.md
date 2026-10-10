# Changes made to this backend (everything else is untouched)

| File | Change |
|---|---|
| `src/models/Profile.js` | New list fields: `heroChips[]`, `marquee[]`, `aboutTags[]` (hero chips, marquee strip, About tags) |
| `src/controllers/profileController.js` | `PUT /api/profile` accepts + cleans the 3 new lists (array or comma-separated string, like `roles`) |
| `src/controllers/projectController.js` | Max images per project: 70 -> **50** |
| `src/middleware/upload.js`, `src/routes/projectRoutes.js` | Multer limit 70 -> 50 files per upload |
| `src/middleware/errorHandler.js` | Clearer upload errors (file too large per type / too many files) |
| `package.json`, `package-lock.json` | `nodemailer` ^6 -> ^10.1.0 and `npm audit fix` (production dependencies: 0 known vulnerabilities; the 3 remaining findings are in `nodemon`, dev only) |
| `README.md` | Limits + new profile fields documented |

Not included in this zip on purpose: your `.env` (it holds secrets), `.git`, `node_modules`. Keep your own `.env`.
After copying these files over your project run `npm install` (nodemailer changed).

The admin panel is in the **frontend** project: `frontend/admin/`.

## SEO / performance round
| File | Change |
|---|---|
| `src/middleware/upload.js` | Profile + project images are converted to WebP (sharp: auto-rotate, max 2000px, q82, 1-year cache header) before going to S3. Résumé upload unchanged. |
| `scripts/prerender.js` | `npm run prerender`: server-side renders the frontend into `index.html` (jsdom), refreshes meta description, Open Graph, Person JSON-LD, `sitemap.xml`, `robots.txt`. |
| `package.json` | + `sharp`, `jsdom`, script `prerender` (run `npm install`) |
| `.env.example` | + `SITE_URL`, `FRONTEND_DIR`, `AWS_PUBLIC_BASE_URL` |
