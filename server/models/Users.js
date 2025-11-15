import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    nom: String,
    prénom: String,
    isVerified: { type: Boolean, default: false },
    numero: String,
    bio: String,
    profilePic: String,
    contacts: [String],
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    resetPasswordExpiresAt: Date,
    resetPasswordToken: String
});

// Export nommé compatible ES Module
export const User = mongoose.model('Users', userSchema);
