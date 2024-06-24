const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://root:h5pnodejs@localhost:27017/testdb1?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true, enum: ['anonymous', 'teacher', 'student', 'admin'] },
});

const User = mongoose.model('User', userSchema);

const checkData = async () => {
  await connectDB();
  const users = await User.find();
  console.log(users);
  await mongoose.connection.close();
};

checkData();
