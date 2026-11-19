const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    mobileNumber: {
        type: String,
    },
    Address: {
        type: String,
        required: true,
    },
    AadharNumber: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String, 
        required: true,
    },
    role: {
        type: String,
        enum: ['voter', 'admin'],
        default: 'voter',
    },
    isVoted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Pre-save middleware to hash password if modified (async style)
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare candidate password
userSchema.methods.comparePassword = async function (userPassword) {
    return await bcrypt.compare(userPassword, this.password);
};

const User = model('User', userSchema);
module.exports = User;
module.exports.User = User;