import app from './app';
// Socket.IO (support tickets) bootstrap in src/ws.js.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { attachSupportWebSocket } = require('./ws.js');

const PORT = process.env.PORT || 3001;

// Keep the server from crashing on uncaught errors (log and continue)
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err?.message || err);
    console.error(err?.stack || '');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[unhandledRejection]', reason);
    console.error('Promise:', promise);
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

attachSupportWebSocket(server);

// Graceful shutdown on SIGTERM/SIGINT so process managers can restart cleanly
const shutdown = () => {
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);