const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { jwtAuthMiddleware, generateToken } = require('../jwt');

// POST /signup or /user/signup - Create User
router.post(['/signup', '/user/signup'], async (req, res) => {
    try {
        const { fullName, age, email, mobileNumber, Address, AadharNumber, password, role } = req.body;

        // Basic validation
        if (!fullName || !age || !email || !Address || !AadharNumber || !password) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }

        if (Number(age) < 18) {
            return res.status(400).json({ error: 'Voters must be at least 18 years old' });
        }

        // Check if an admin already exists if trying to create an admin
        if (role === 'admin') {
            const adminUser = await User.findOne({ role: 'admin' });
            if (adminUser) {
                return res.status(400).json({ error: 'An admin user already exists' });
            }
        }

        // Check if AadharNumber or email already exists
        const existingUser = await User.findOne({
            $or: [{ AadharNumber }, { email }]
        });
        if (existingUser) {
            if (existingUser.AadharNumber === AadharNumber) {
                return res.status(400).json({ error: 'User with this Aadhar Number already exists' });
            }
            return res.status(400).json({ error: 'User with this email address already exists' });
        }

        const newUser = new User({
            fullName,
            age: Number(age),
            email,
            mobileNumber,
            Address,
            AadharNumber,
            password,
            role: role === 'admin' ? 'admin' : 'voter'
        });

        const savedUser = await newUser.save();

        const payload = {
            id: savedUser.id,
            role: savedUser.role,
            fullName: savedUser.fullName
        };

        const token = generateToken(payload);

        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: savedUser.id,
                fullName: savedUser.fullName,
                email: savedUser.email,
                role: savedUser.role,
                isVoted: savedUser.isVoted
            },
            token
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// POST /login or /user/login - Login user
router.post(['/login', '/user/login'], async (req, res) => {
    try {
        const { AadharNumber, email, password } = req.body;

        if ((!AadharNumber && !email) || !password) {
            return res.status(400).json({ error: 'Aadhar Number (or Email) and Password are required' });
        }

        // Search by AadharNumber or email
        const user = await User.findOne(AadharNumber ? { AadharNumber } : { email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid Aadhar Number/Email or Password' });
        }

        const payload = {
            id: user.id,
            role: user.role,
            fullName: user.fullName
        };

        const token = generateToken(payload);
        res.cookie('jwt', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isVoted: user.isVoted
            },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /profile or /user/profile - Access profile
router.get(['/profile', '/user/profile'], jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ user });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// PUT /profile/password or /user/profile/password - Profile Password change
router.put(['/profile/password', '/user/profile/password'], jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Both current password and new password are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Password update error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// POST /logout or /user/logout
router.post(['/logout', '/user/logout'], (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
