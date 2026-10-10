const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const multerS3 = require('multer-s3');
const sharp = require('sharp');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3, BUCKET } = require('../config/s3');

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function imageFileFilter(_req, file, cb) {
  if (IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
}

function resumeFileFilter(_req, file, cb) {
  if (RESUME_TYPES.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Only PDF, DOC or DOCX files are allowed.'));
}

// Every uploaded file gets a random, collision-proof key inside a folder
// per type: uploads/profile/, uploads/resume/, uploads/project/.
function makeKey(folder) {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `uploads/${folder}/${unique}${ext}`);
  };
}

function makeS3Storage(folder) {
  return multerS3({
    s3,
    bucket: BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: makeKey(folder),
  });
}

// ---------- Images: every upload is converted to WebP before it reaches S3 ----------
// multer first spools the upload to a temp file (so 50 big images never sit in RAM
// at once), then processImages() converts them one by one: auto-rotate from EXIF,
// max 2000px on the longest side, WebP quality 82, uploaded with a long cache header.
// Animated GIFs stay animated (animated WebP). The stored URL (file.location) is the
// .webp object, so controllers keep using f.location exactly as before.
const MAX_IMAGE_SIDE = 2000;
const WEBP_QUALITY = 82;

function publicUrlFor(key) {
  // Set AWS_PUBLIC_BASE_URL (e.g. your CloudFront domain) to serve images from a CDN.
  const base = (process.env.AWS_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  if (base) return `${base}/${key}`;
  return `https://${BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
}

function imageUploader(folder, limits) {
  const multerUpload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    fileFilter: imageFileFilter,
    limits,
  });

  async function convertOne(file) {
    const body = await sharp(file.path, { animated: true })
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const key = `uploads/${folder}/${unique}.webp`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    file.key = key;
    file.location = publicUrlFor(key);
    file.mimetype = 'image/webp';
    file.size = body.length;
  }

  async function processImages(req, _res, next) {
    const files = req.file ? [req.file] : (req.files || []);
    const uploaded = [];
    try {
      for (const f of files) {
        try {
          await convertOne(f);
          uploaded.push(f);
        } catch (err) {
          if (!f.key) { err.status = err.status || 400; err.message = `Could not process image "${f.originalname}": ${err.message}`; }
          throw err;
        }
      }
      next();
    } catch (err) {
      // roll back whatever was already pushed to S3 for this request
      await Promise.all(uploaded.map((f) => removeFromS3(f.location)));
      next(err);
    } finally {
      await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
    }
  }

  return {
    single: (field) => [multerUpload.single(field), processImages],
    array: (field, max) => [multerUpload.array(field, max), processImages],
  };
}

// ---------- Profile picture ----------
const upload = imageUploader('profile', { fileSize: 5 * 1024 * 1024 }); // 5MB

// ---------- Project gallery images (max 50 per project, enforced again in the controller) ----------
const uploadProjectImages = imageUploader('project', { fileSize: 8 * 1024 * 1024, files: 50 }); // 8MB per image, max 50 per request

// ---------- Résumé / CV (PDF/DOC) ----------
const uploadResume = multer({
  storage: makeS3Storage('resume'),
  fileFilter: resumeFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Deletes a previously-uploaded S3 object given its stored URL. Safe no-op
// for empty values or URLs that don't belong to our bucket.
async function removeFromS3(fileUrl) {
  if (!fileUrl) return;
  try {
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!key.startsWith('uploads/')) return; // not one of ours - don't touch it
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    // Never let a failed cleanup block the actual request (e.g. record was
    // already updated). Just log it.
    console.warn('Could not delete S3 object:', fileUrl, err.message);
  }
}

// Fetches an S3 object (as a readable stream) given its stored URL, without
// exposing the S3 URL itself to the client. Used so the résumé can be
// downloaded through our own backend route instead of a direct S3 link.
// Returns null if fileUrl is empty or isn't one of our own uploads.
async function getS3ObjectStream(fileUrl) {
  if (!fileUrl) return null;
  const url = new URL(fileUrl);
  const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
  if (!key.startsWith('uploads/')) return null; // not one of ours - don't touch it
  const result = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return { stream: result.Body, contentType: result.ContentType, key };
}

module.exports = { upload, uploadProjectImages, uploadResume, removeFromS3, getS3ObjectStream };
