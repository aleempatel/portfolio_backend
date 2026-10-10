const path = require('path');
const Profile = require('../models/Profile');
const asyncHandler = require('../utils/asyncHandler');
const { removeFromS3, getS3ObjectStream } = require('../middleware/upload');

async function findProfileDoc() {
  return Profile.findOne();
}

const getProfile = asyncHandler(async (_req, res) => {
  const profile = await findProfileDoc();
  res.json({ success: true, data: profile || {} });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowed = [
    'name', 'title', 'roles', 'heroChips', 'marquee', 'aboutTags', 'bio', 'aboutBio', 'email', 'phone', 'location',
    'github', 'linkedin', 'twitter', 'website', 'resumeUrl',
  ];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  // List fields may arrive as a real array (JSON) or as a comma-separated string
  // from a plain HTML form - normalize either way into a clean string array.
  for (const key of ['roles', 'heroChips', 'marquee', 'aboutTags']) {
    if (update[key] === undefined) continue;
    if (typeof update[key] === 'string') {
      update[key] = update[key].split(',').map((r) => r.trim()).filter(Boolean);
    } else if (Array.isArray(update[key])) {
      update[key] = update[key].map((r) => String(r).trim()).filter(Boolean);
    }
  }

  const profile = await Profile.findOneAndUpdate({}, update, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });

  res.json({ success: true, data: profile, message: 'Profile saved.' });
});

// POST /api/profile/picture (protected, multipart/form-data field "picture")
// Stored directly in the AWS S3 bucket - req.file.location is the public URL.
const uploadPicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Use field name "picture".' });
  }
  let profile = await findProfileDoc();
  if (profile && profile.profilePicture) await removeFromS3(profile.profilePicture);

  profile = await Profile.findOneAndUpdate(
    {},
    { profilePicture: req.file.location },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, data: profile, message: 'Profile picture updated.' });
});

const deletePicture = asyncHandler(async (_req, res) => {
  const profile = await findProfileDoc();
  if (!profile || !profile.profilePicture) {
    return res.json({ success: true, data: profile || {}, message: 'No profile picture to remove.' });
  }
  await removeFromS3(profile.profilePicture);
  profile.profilePicture = '';
  await profile.save();
  res.json({ success: true, data: profile, message: 'Profile picture removed.' });
});

// POST /api/profile/resume  (protected, multipart/form-data field "resume")
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded. Use field name "resume".' });
  }
  let profile = await findProfileDoc();
  if (profile && profile.resumeUrl) await removeFromS3(profile.resumeUrl);

  profile = await Profile.findOneAndUpdate(
    {},
    { resumeUrl: req.file.location },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, data: profile, message: 'Résumé updated.' });
});

// GET /api/profile/resume/download  (public)
// Streams the résumé through OUR backend instead of exposing the raw AWS S3
// URL to the browser - the frontend should link/point to this route.
const downloadResume = asyncHandler(async (_req, res) => {
  const profile = await findProfileDoc();
  if (!profile || !profile.resumeUrl) {
    return res.status(404).json({ success: false, message: 'No résumé uploaded yet.' });
  }

  const object = await getS3ObjectStream(profile.resumeUrl);
  if (!object) {
    return res.status(404).json({ success: false, message: 'Résumé file not found.' });
  }

  const ext = path.extname(profile.resumeUrl.split('?')[0]) || '.pdf';
  const filename = `${(profile.name || 'Resume').replace(/\s+/g, '_')}${ext}`;

  res.setHeader('Content-Type', object.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  object.stream.pipe(res);
});

// GET /api/profile/resume/view  (public)
// Same as downloadResume, but streams "inline" instead of "attachment" so the
// browser can render it in a PDF viewer/iframe. Still goes through OUR
// backend, so the frontend never has to expose the raw AWS S3 URL.
const viewResume = asyncHandler(async (_req, res) => {
  const profile = await findProfileDoc();
  if (!profile || !profile.resumeUrl) {
    return res.status(404).json({ success: false, message: 'No résumé uploaded yet.' });
  }

  const object = await getS3ObjectStream(profile.resumeUrl);
  if (!object) {
    return res.status(404).json({ success: false, message: 'Résumé file not found.' });
  }

  const ext = path.extname(profile.resumeUrl.split('?')[0]) || '.pdf';
  const filename = `${(profile.name || 'Resume').replace(/\s+/g, '_')}${ext}`;

  res.setHeader('Content-Type', object.contentType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  object.stream.pipe(res);
});

// DELETE /api/profile/resume  (protected)
const deleteResume = asyncHandler(async (_req, res) => {
  const profile = await findProfileDoc();
  if (!profile || !profile.resumeUrl) {
    return res.json({ success: true, data: profile || {}, message: 'No résumé to remove.' });
  }
  await removeFromS3(profile.resumeUrl);
  profile.resumeUrl = '';
  await profile.save();
  res.json({ success: true, data: profile, message: 'Résumé removed.' });
});

module.exports = {
  getProfile, updateProfile, uploadPicture, deletePicture, uploadResume, deleteResume, downloadResume, viewResume,
};
