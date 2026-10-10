require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const Profile = require('../src/models/Profile');

async function seed() {
  const uri = process.env.MONGO_URI;
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!uri) {
    console.error('MONGO_URI is not set in .env');
    process.exit(1);
  }
  if (!username || !password) {
    console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('ADMIN_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const existing = await Admin.findOne({ username });
  if (existing) {
    existing.password = password; // pre-save hook re-hashes
    await existing.save();
    console.log(`Admin "${username}" already existed — password reset to the value in .env.`);
  } else {
    await Admin.create({ username, password });
    console.log(`Admin "${username}" created.`);
  }

  // Make sure a (possibly empty) profile document exists so GET /api/profile
  // always returns something predictable.
  const profileExists = await Profile.findOne();
  if (!profileExists) {
    await Profile.create({});
    console.log('Empty profile document created — fill it in from the admin panel.');
  }

  console.log('\nDone. Log in to the admin panel with:');
  console.log(`  username: ${username}`);
  console.log(`  password: ${password}`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
