try {
    const app = require('../server/server');
    module.exports = app;
} catch (error) {
    console.error('SERVER STARTUP ERROR:', error);

    // Debug: Collect available environment keys (not values)
    const envKeys = Object.keys(process.env).sort().join(', ');
    console.log('Available Env Keys:', envKeys);

    const express = require('express');
    const app = express();
    app.all('*', (req, res) => {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error during startup',
            error: error.message,
            stack: error.stack,
            debugEnvKeys: envKeys // Safe to expose keys
        });
    });
    module.exports = app;
}
