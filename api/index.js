try {
    const app = require('../server/server');
    module.exports = app;
} catch (error) {
    console.error('SERVER STARTUP ERROR:', error);
    const express = require('express');
    const app = express();
    app.all('*', (req, res) => {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error during startup',
            error: error.message,
            stack: error.stack
        });
    });
    module.exports = app;
}
