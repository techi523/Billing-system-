module.exports = {
    apps: [
        {
            name: 'billing-system',
            script: './dist/server.js',
            instances: 'max', // Use all available CPU cores
            exec_mode: 'cluster',

            // Environment variables
            env: {
                NODE_ENV: 'development',
                PORT: 3000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000,
            },

            // Logging
            error_file: './logs/pm2-error.log',
            out_file: './logs/pm2-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,

            // Auto-restart configuration
            autorestart: true,
            max_restarts: 10,
            min_uptime: '10s',
            max_memory_restart: '500M',

            // Graceful shutdown
            kill_timeout: 5000,
            listen_timeout: 3000,
            shutdown_with_message: true,

            // Watch for file changes (disable in production)
            watch: false,
            ignore_watch: ['node_modules', 'logs', 'uploads'],

            // Cron restart (optional - restart daily at 3 AM)
            cron_restart: '0 3 * * *',

            // Source map support
            source_map_support: true,

            // Instance variables
            instance_var: 'INSTANCE_ID',
        },

        // Background services (optional - run as separate processes)
        {
            name: 'settlement-engine',
            script: './dist/services/settlement-engine.js',
            instances: 1,
            exec_mode: 'fork',
            cron_restart: '0 */6 * * *', // Restart every 6 hours
            autorestart: true,
            max_memory_restart: '200M',
            env_production: {
                NODE_ENV: 'production',
            },
        },

        {
            name: 'traffic-monitor',
            script: './dist/services/traffic-monitor.service.js',
            instances: 1,
            exec_mode: 'fork',
            autorestart: true,
            max_memory_restart: '200M',
            env_production: {
                NODE_ENV: 'production',
            },
        },
    ],
};
