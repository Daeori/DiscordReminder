class ErrorHandler {
    /**
     * Sets up global error handlers to catch unhandled promise rejections and uncaught exceptions.
     * This prevents the bot from crashing unexpectedly and ensures proper error logging.
     */
    static setupGlobalErrorHandlers() {
        // Listen for unhandled promise rejections in asynchronous code
        process.on('unhandledRejection', (reason, promise) => {
            // Log the reason and the promise that was rejected but not caught
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Listen for uncaught exceptions in synchronous code
        process.on('uncaughtException', (err) => {
            // Log the error that caused the uncaught exception
            console.error('Uncaught Exception thrown:', err);
            // Exit the process to prevent the bot from continuing in an undefined state
            process.exit(1);
        });
    }
}

module.exports = ErrorHandler;
