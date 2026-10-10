# Portfolio Backend

REST API for the `portfolio-frontend` static site + admin panel. Every piece
of content on the public site — profile/bio, profile picture, contact info
(email, phone, GitHub, LinkedIn, etc.), skills, education, work experience,
and projects — is stored in MongoDB and fully editable from the admin panel,
protected by a single admin login (JWT auth).

```
portfolio-backend/
├── server.js                 # App entry point
├── package.json
├── .env.example
├── uploads/                  # Uploaded profile pictures (served at /uploads/...)
├── scripts/
│   └── seed.js                # Creates the first admin user
└── src/
    ├── config/db.js           # MongoDB connection
    ├── models/                 # Admin, Profile, Project, Skill, Experience, Education, Course
    ├── middleware/              # auth (JWT), upload (multer), errorHandler
    ├── controllers/             # Route handlers (profile + generic CRUD factory)
    └── routes/                   # Express routers, mounted under /api
```

## 1. Setup

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable         | Description                                                            |
|-------------------|--------------------------------------------------------------------------|
| `PORT`            | Port the API listens on (default `5000`)                                |
| `MONGO_URI`       | MongoDB connection string (local `mongodb://127.0.0.1:27017/portfolio` or an Atlas URI) |
| `JWT_SECRET`      | Long random string used to sign login tokens                             |
| `JWT_EXPIRES_IN`  | Token lifetime, e.g. `7d`                                                |
| `FRONTEND_URL`    | Exact origin the frontend is served from (CORS is locked to this)        |
| `ADMIN_USERNAME`  | Used only by `npm run seed` to create your first admin login             |
| `ADMIN_PASSWORD`  | Used only by `npm run seed` (min 6 characters)                           |

```bash
npm install
npm run seed     # creates the admin account (and an empty profile doc)
npm run dev       # starts on http://localhost:5000 with auto-reload
# or: npm start
```

## 2. Point the frontend at it

Serve `portfolio-frontend/` with any static server (e.g. `npx serve .`), then
open the admin panel at `/admin/` and log in with the `ADMIN_USERNAME` /
`ADMIN_PASSWORD` from your `.env`. If the API isn't on `http://localhost:5000`,
set the correct URL from the admin login screen ("change API URL") or the
Settings tab.

## API Reference

All responses are JSON: `{ "success": true, "data": ... }` on success, or
`{ "success": false, "message": "..." }` on error. Protected routes require
`Authorization: Bearer <token>` (the token returned by login).

### Auth
| Method | Path                        | Auth | Description               |
|--------|------------------------------|------|-----------------------------|
| POST   | `/api/auth/login`             | –    | `{ username, password }` → `{ token, user }` |
| POST   | `/api/auth/logout`            | –    | No-op (client discards token) |
| PUT    | `/api/auth/change-password`   | ✅   | `{ currentPassword, newPassword }` |

### Profile (single document)
| Method | Path                     | Auth | Description |
|--------|----------------------------|------|-------------|
| GET    | `/api/profile`              | –    | Public profile data |
| PUT    | `/api/profile`              | ✅   | Update name, title, bio, email, phone, location, github, linkedin, twitter, website, resumeUrl |
| POST   | `/api/profile/picture`      | ✅   | multipart/form-data, field `picture` (jpg/png/webp/gif, ≤5MB) |
| DELETE | `/api/profile/picture`      | ✅   | Removes the current picture |

### Projects / Skills / Experience / Education
Each resource shares the same CRUD shape:

| Method | Path                        | Auth |
|--------|------------------------------|------|
| GET    | `/api/<resource>`             | –    |
| POST   | `/api/<resource>`             | ✅   |
| PUT    | `/api/<resource>/:id`         | ✅   |
| DELETE | `/api/<resource>/:id`         | ✅   |

Where `<resource>` is `projects`, `skills`, `experience`, `education`, or `courses`.

### Contact form
| Method | Path            | Auth | Description |
|--------|------------------|------|-------------|
| POST   | `/api/contact`    | –    | `{ name, email, subject, message }` → emails the message |

Emails the message via SMTP (see `SMTP_*` in `.env`). The **recipient is
never hardcoded** - it's read fresh from the Profile document's `email`
field on every submission, so changing the email from the admin panel
immediately changes where new messages are delivered. If `Profile.email`
is empty, it falls back to `CONTACT_FALLBACK_EMAIL` from `.env`. The
sender's address is set as the `Reply-To` header, so replying to the
notification email goes straight back to them.

**Project fields:** `title, category, description, longDescription, technologies[], imageUrl, images[], order, liveUrl, githubUrl, featured`

**Skill fields:** `name, category, proficiency (0-100), order, iconUrl`

**Experience fields:** `jobTitle, company, location, employmentType, startDate, endDate, current, description, responsibilities[], technologies[], order`

**Education fields:** `degree, institution, location, grade, startDate, endDate, description, order`

**Course fields:** `title, provider, description, date, certificateUrl, order`

**Profile fields (`PUT /api/profile`):** `name, title, roles[], heroChips[], marquee[], aboutTags[], bio, aboutBio, email, phone, location, github, linkedin, twitter, website, resumeUrl` — `roles` is the rotating text under the name on the hero (e.g. "Data Science" / "Machine Learning" / "AI"), fully admin-editable. `bio` is the short hero intro, `aboutBio` is the longer About-section write-up — the two "introductions" the admin controls.

Lists are returned sorted by `order` ascending, then by creation date.

## Uploaded files (AWS S3)

Profile pictures, résumé/CV, and project gallery images (max 50 per
project) are uploaded directly to an **AWS S3 bucket** — nothing is saved
to local disk. Each upload gets a unique key under `uploads/profile/`,
`uploads/resume/`, or `uploads/project/`, and the full S3 URL is stored in
MongoDB. The frontend's `assetUrl()` helper passes these absolute URLs
straight through.

**Setup:**
1. Create an S3 bucket.
2. Allow public read on objects — either a bucket policy allowing
   `s3:GetObject` on `arn:aws:s3:::<bucket>/*`, or put a CloudFront
   distribution in front of it, so uploaded images/résumés are viewable
   in the browser.
3. Create an IAM user (or role) with `s3:PutObject`, `s3:DeleteObject`,
   and `s3:GetObject` on that bucket, and put its access key in `.env`.
4. Fill in `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY` in `.env` (see `.env.example`).

Deleting a record that owns a file (removing a project image, replacing
the profile picture, etc.) also deletes the corresponding S3 object.

## Admin panel

The admin panel lives in the frontend project at `frontend/admin/`. Open
`/admin/` on the frontend (for example `http://localhost:3000/admin/`) and log in with the `ADMIN_USERNAME` /
`ADMIN_PASSWORD` from `.env` (after running `npm run seed`). From there the
admin can control literally everything on the site: profile picture, CV
file, both intro texts, the rotating roles under the name, skills,
education, courses, experience, projects (with image galleries, up to 50
images each), and all contact links (email, phone, GitHub, LinkedIn).

## Deployment notes

- Any Node host works (Railway, Render, Fly.io, a VPS, etc.). Set the same
  env vars there, and point `FRONTEND_URL` at wherever the static frontend
  ends up being hosted.
- Because uploads go straight to S3, the backend itself is stateless —
  safe to run on multiple instances or a platform with an ephemeral
  filesystem (no local `uploads/` folder to worry about).
- Never commit `.env` — only `.env.example` is meant to be shared, and
  never commit real AWS keys anywhere in the repo.
