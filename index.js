require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./db');

const userRoutes = require('./routes/userRoutes');
const candidateRoutes = require('./routes/candidateRoutes');

const app = express();
const port = process.env.PORT || 4000;

// Database Connection
connectDB();

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// HTML Page Routes
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/signup', (req, res, next) => {
    if (req.accepts('html')) {
        return res.render('signup');
    }
    next();
});

app.get('/signin', (req, res) => {
    res.render('signin');
});

// API Routes - Mounted at both root and subpaths for maximum compatibility
app.use('/', userRoutes);
app.use('/user', userRoutes);

app.use('/', candidateRoutes);
app.use('/candidate', candidateRoutes);

// 404 Handler
app.use((req, res) => {
    if (req.accepts('html')) {
        return res.status(404).render('home');
    }
    res.status(404).json({ error: 'Route Not Found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled App Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(port, () => {
    console.log(`Voting App server running at http://localhost:${port}`);
});