import mongoose, { Document, Schema } from 'mongoose';

export interface IUserModel extends Document {
    username: string;
    name: string;
    email: string;
    role: 'anonymous' | 'teacher' | 'student' | 'admin';
}

const userSchema = new Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ['anonymous', 'teacher', 'student', 'admin'] },
});

const UserM = mongoose.model<IUserModel>('User', userSchema);

export default UserM;
