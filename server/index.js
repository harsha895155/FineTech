const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectMasterDB = require('./config/masterDb');

// Load environment variables relative to this file
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5011; 
// Initialize Master Database Connection
console.log('🚀 [Server] Target Port:', PORT);
// Tiny comment to trigger restart
console.log('🚀 [Server] Initializing Master Database Connection...');
connectMasterDB()
    .then(conn => {
        console.log('✅ [Server] Master Database connected successfully:', conn.name);
    })
    .catch(err => {
        console.error('❌ [Server] Initial Master Database connection failed!');
        console.error('❌ Error Message:', err.message);
    });

// Global Request Logger for Debugging
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🌐 [${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
});

// Standard Middlewares
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multi-Tenant Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/income', require('./routes/incomeRoutes'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/support', require('./routes/support'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/banks', require('./routes/bankRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/transfer', require('./routes/transferRoutes'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
    // 1. Serve root views folder (legacy HTML files)
    app.use('/views', express.static(path.join(__dirname, '../views')));
    
    // 2. Serve root public and client public for CSS/Assets
    app.use('/public', express.static(path.join(__dirname, '../public')));
    app.use('/css', express.static(path.join(__dirname, '../client/public/css')));
    app.use('/js', express.static(path.join(__dirname, '../client/public/js')));

    // 3. Serve Vite build output
    app.use(express.static(path.join(__dirname, '../client/dist')));

    // 4. SPA Fallback (Only if not a views/api/public request)
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api') && !req.path.startsWith('/views')) {
            res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
        }
    });
}


// Health Check
app.get('/', (req, res) => {
    res.json({ 
        message: 'Professional Multi-Tenant API is running',
        status: 'Healthy',
        version: '1.0.0'
    });
});

// 404 Not Found Handling - Force JSON
app.use((req, res, next) => {
    console.log(`⚠️  [404] Route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `API Route ${req.method} ${req.originalUrl} not found on this server`
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
