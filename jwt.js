require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in .env');
}

const jwtAuthMiddleware = (req, res, next) => {
    // Check if token exists in authorization header, cookies, or custom header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    } else if (req.headers.token) {
        token = req.headers.token;
    }

    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html') && !req.headers.authorization;

    if (!token) {
        if (acceptsHtml) {
            return res.redirect('/signin');
        }
        return res.status(401).json({ error: 'Unauthorized: Token Not Found' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        if (acceptsHtml) {
            res.clearCookie('jwt');
            return res.redirect('/signin');
        }
        return res.status(401).json({ error: 'Invalid or Expired Token' });
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            req.user = null;
        }
    }
    next();
};

const generateToken = (userData) => {
    return jwt.sign(userData, JWT_SECRET, { expiresIn: '1d' });
};

const checkAdminRole = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access Denied: User does not have admin privileges' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {
    jwtAuthMiddleware,
    optionalAuth,
    generateToken,
    checkAdminRole
};