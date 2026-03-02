const mongoose = require('mongoose');

let masterDbConnection = null;
let connectionPromise = null;

/**
 * Connects to the Master MongoDB instance.
 * Ensures a singleton connection and handles reconnections and concurrent requests.
 */
const connectMasterDB = async () => {
    try {
        // 1. Return existing active connection
        if (masterDbConnection && masterDbConnection.readyState === 1) {
            return masterDbConnection;
        }

        // 2. Return in-progress connection promise if available
        if (connectionPromise) {
            console.log('⏳ [MasterDB] Connection attempt already in progress, waiting...');
            return connectionPromise;
        }

        // 3. Initiate new connection
        console.log(`🔄 [MasterDB] Connecting to URI: ${process.env.MASTER_DB_URI ? 'AUTHENTICATED_URI_HIDDEN' : '⚠️ MISSING'}`);
        
        if (!process.env.MASTER_DB_URI) {
            throw new Error('MASTER_DB_URI is not defined in environment variables');
        }

        connectionPromise = mongoose.createConnection(process.env.MASTER_DB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10
        }).asPromise();

        masterDbConnection = await connectionPromise;

        // Reset promise after success
        connectionPromise = null;

        // Monitor connection events
        masterDbConnection.on('connected', () => {
            console.log('✅ [MasterDB] Connected to database:', masterDbConnection.name);
        });

        masterDbConnection.on('error', (err) => {
            console.error('❌ [MasterDB] Connection error:', err.message);
            masterDbConnection = null;
            connectionPromise = null;
        });

        masterDbConnection.on('disconnected', () => {
            console.warn('⚠️ [MasterDB] Disconnected from server');
            masterDbConnection = null;
            connectionPromise = null;
        });

        return masterDbConnection;
    } catch (error) {
        console.error('❌ [MasterDB] Connection failed:', error.message);
        masterDbConnection = null;
        connectionPromise = null;
        throw error;
    }
};

module.exports = connectMasterDB;
