const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = 'mongodb+srv://srujanakulawar_db_user:qcQkiy18HsT4555l@scorecalculator.ecfzhg4.mongodb.net/?appName=scorecalculator';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      existingAdmin.password = await bcrypt.hash('admin123', 10);
      existingAdmin.role = 'Admin';
      await existingAdmin.save();
      console.log('Admin user updated with password admin123.');
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'Admin'
      });
      await admin.save();
      console.log('Admin user created successfully.');
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    mongoose.disconnect();
  });
