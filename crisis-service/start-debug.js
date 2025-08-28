// Debug wrapper for Crisis Service
console.log('Starting Crisis Service Debug...');

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

try {
    console.log('Loading server.js...');
    require('./server.js');
    console.log('Server.js loaded successfully');
} catch (error) {
    console.error('Failed to load server.js:', error);
    process.exit(1);
}