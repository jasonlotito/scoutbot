const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
require('dotenv').config();

const TwitchBlackjackBot = require('./src/twitchBot');
const AuthService = require('./src/authService');

let mainWindow;
let bot = null;
let authService = null;
let store = null;
let botStatus = {
    connected: false,
    channels: [],
    activeGames: 0,
    totalCommands: 0,
    uptime: null,
    lastActivity: null
};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // We'll create this later
        title: 'Twitch Blackjack Bot Dashboard'
    });

    mainWindow.loadFile('dashboard.html');

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Send initial status and check authentication
    mainWindow.webContents.once('did-finish-load', async () => {
        sendStatusUpdate();
        await checkAuthenticationOnStartup();
    });
}

app.whenReady().then(() => {
    // Initialize secure store for settings
    store = new Store({
        name: 'twitch-blackjack-bot',
        encryptionKey: 'twitch-blackjack-bot-secure-key-2024'
    });

    createWindow();
});

app.on('window-all-closed', () => {
    if (bot) {
        bot.disconnect();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Check if authentication is needed on startup
async function checkAuthenticationOnStartup() {
    // First try to load from secure storage
    let config = await SecureCredentials.loadCredentials();

    // If no secure credentials, try .env file
    if (!config || !config.clientId) {
        config = {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            accessToken: process.env.TWITCH_ACCESS_TOKEN,
            refreshToken: process.env.TWITCH_REFRESH_TOKEN,
            channels: process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()).filter(ch => ch) : []
        };

        // If we found credentials in .env, migrate them to secure storage
        if (config.clientId && config.clientId !== 'your_client_id_here') {
            console.log('🔄 Found .env credentials, migrating to secure storage...');
            await SecureCredentials.saveCredentials(config);
        }
    }

    // Check if any required credentials are missing
    const needsAuth = !config ||
                     !config.clientId ||
                     !config.clientSecret ||
                     !config.accessToken ||
                     !config.refreshToken ||
                     config.clientId === 'your_client_id_here' ||
                     config.clientSecret === 'your_client_secret_here' ||
                     config.accessToken === 'your_access_token_here' ||
                     config.refreshToken === 'your_refresh_token_here';

    if (needsAuth) {
        console.log('🔐 Authentication required - checking secure storage backup...');

        // Try to migrate old credentials first
        const migrated = await SecureCredentials.migrateCredentials();
        if (migrated) {
            config = await SecureCredentials.loadCredentials();
            if (config && config.clientId && config.accessToken) {
                console.log('✅ Credentials migrated and loaded from secure storage');
                mainWindow.webContents.send('credentials-recovered');
                return;
            }
        }

        // Try to recover from old OS settings format
        const savedSettings = loadConfigFromSettings();
        if (savedSettings && savedSettings.clientId && savedSettings.accessToken) {
            console.log('📱 Found credentials in old OS settings - migrating to secure storage...');

            const migrateResult = await SecureCredentials.saveCredentials(savedSettings);
            if (migrateResult.success) {
                console.log('✅ Credentials migrated to secure storage');
                // Clean up old format
                store.delete('credentials');
                mainWindow.webContents.send('credentials-recovered');
                return;
            }
        }

        console.log('🔐 No backup credentials found - opening wizard');
        mainWindow.webContents.send('show-auth-wizard');
    } else {
        console.log('✅ Authentication credentials found and valid');

        // Store current config globally for bot startup
        global.currentCredentials = config;
    }
}

// Initialize auth service
function getAuthService() {
    if (!authService) {
        authService = new AuthService();
    }
    return authService;
}

// IPC handlers
ipcMain.handle('get-config', async () => {
    // Try to load from secure storage first
    let config = await SecureCredentials.loadCredentials();

    if (!config || !config.clientId) {
        // Fallback to .env file
        require('dotenv').config();
        config = {
            clientId: process.env.TWITCH_CLIENT_ID || '',
            clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
            accessToken: process.env.TWITCH_ACCESS_TOKEN || '',
            refreshToken: process.env.TWITCH_REFRESH_TOKEN || '',
            channels: process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()).filter(ch => ch) : []
        };
    }

    return {
        clientId: config.clientId,
        clientSecret: config.clientSecret ? '***configured***' : '',
        accessToken: config.accessToken ? '***configured***' : '',
        refreshToken: config.refreshToken ? '***configured***' : '',
        channels: config.channels || [],
        // Also return whether .env file exists
        envFileExists: fs.existsSync('.env'),
        // Return raw values for validation (but masked for security)
        hasClientId: !!(config.clientId && config.clientId !== 'your_client_id_here'),
        hasClientSecret: !!(config.clientSecret && config.clientSecret !== 'your_client_secret_here'),
        hasAccessToken: !!(config.accessToken && config.accessToken !== 'your_access_token_here'),
        hasRefreshToken: !!(config.refreshToken && config.refreshToken !== 'your_refresh_token_here'),
        // Indicate storage method
        usingSecureStorage: !!(config && config.version && config.version.startsWith('2.'))
    };
});

ipcMain.handle('save-config', async (event, config) => {
    try {
        let envContent = '';

        // Try to read existing .env file to preserve comments and structure
        if (fs.existsSync('.env')) {
            envContent = fs.readFileSync('.env', 'utf8');
        } else {
            // If no .env exists, use .env.example as template
            if (fs.existsSync('.env.example')) {
                envContent = fs.readFileSync('.env.example', 'utf8');
            } else {
                // Fallback to basic template
                envContent = `# Twitch Bot Configuration
# Copy this file to .env and fill in your actual values

# Your Twitch application's Client ID (create app at https://dev.twitch.tv/console/apps)
TWITCH_CLIENT_ID=your_client_id_here

# Your Twitch application's Client Secret
TWITCH_CLIENT_SECRET=your_client_secret_here

# Access token for your bot account (get from https://twitchtokengenerator.com/)
# Select scopes: chat:read, chat:edit
TWITCH_ACCESS_TOKEN=your_access_token_here

# Refresh token (optional but recommended for automatic token refresh)
TWITCH_REFRESH_TOKEN=your_refresh_token_here

# Comma-separated list of channels to join (without # prefix)
CHANNELS=your_channel_name,another_channel
`;
            }
        }

        // Update only the values that were provided (not empty)
        if (config.clientId && config.clientId.trim()) {
            envContent = envContent.replace(/^TWITCH_CLIENT_ID=.*$/m, `TWITCH_CLIENT_ID=${config.clientId}`);
        }

        if (config.clientSecret && config.clientSecret.trim()) {
            envContent = envContent.replace(/^TWITCH_CLIENT_SECRET=.*$/m, `TWITCH_CLIENT_SECRET=${config.clientSecret}`);
        }

        if (config.accessToken && config.accessToken.trim()) {
            envContent = envContent.replace(/^TWITCH_ACCESS_TOKEN=.*$/m, `TWITCH_ACCESS_TOKEN=${config.accessToken}`);
        }

        if (config.refreshToken !== undefined) {
            if (config.refreshToken && config.refreshToken.trim()) {
                envContent = envContent.replace(/^TWITCH_REFRESH_TOKEN=.*$/m, `TWITCH_REFRESH_TOKEN=${config.refreshToken}`);
            } else {
                // If refresh token is empty, keep the line but clear the value
                envContent = envContent.replace(/^TWITCH_REFRESH_TOKEN=.*$/m, 'TWITCH_REFRESH_TOKEN=');
            }
        }

        if (config.channels && Array.isArray(config.channels)) {
            const channelsValue = config.channels.filter(ch => ch.trim()).join(',');
            envContent = envContent.replace(/^CHANNELS=.*$/m, `CHANNELS=${channelsValue}`);
        }

        fs.writeFileSync('.env', envContent);

        // Clear the require cache and reload environment variables
        delete require.cache[require.resolve('dotenv')];
        require('dotenv').config();

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-env-file', async () => {
    try {
        // Don't overwrite existing .env file
        if (fs.existsSync('.env')) {
            return { success: false, error: '.env file already exists' };
        }

        // Copy from .env.example if it exists, otherwise create basic template
        let envContent;
        if (fs.existsSync('.env.example')) {
            envContent = fs.readFileSync('.env.example', 'utf8');
        } else {
            envContent = `# Twitch Bot Configuration
# Copy this file to .env and fill in your actual values

# Your Twitch application's Client ID (create app at https://dev.twitch.tv/console/apps)
TWITCH_CLIENT_ID=your_client_id_here

# Your Twitch application's Client Secret
TWITCH_CLIENT_SECRET=your_client_secret_here

# Access token for your bot account (get from https://twitchtokengenerator.com/)
# Select scopes: chat:read, chat:edit
TWITCH_ACCESS_TOKEN=your_access_token_here

# Refresh token (optional but recommended for automatic token refresh)
TWITCH_REFRESH_TOKEN=your_refresh_token_here

# Comma-separated list of channels to join (without # prefix)
CHANNELS=your_channel_name,another_channel
`;
        }

        fs.writeFileSync('.env', envContent);

        // Reload environment variables
        require('dotenv').config();

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('start-bot', async () => {
    if (bot) {
        return { success: false, error: 'Bot is already running' };
    }

    try {
        // Load credentials from secure storage first, then fallback to .env
        let config = await SecureCredentials.loadCredentials();

        if (!config || !config.clientId) {
            // Fallback to .env file
            require('dotenv').config({ override: true });
            config = {
                clientId: process.env.TWITCH_CLIENT_ID,
                clientSecret: process.env.TWITCH_CLIENT_SECRET,
                accessToken: process.env.TWITCH_ACCESS_TOKEN,
                refreshToken: process.env.TWITCH_REFRESH_TOKEN,
                channels: process.env.CHANNELS ? process.env.CHANNELS.split(',').map(ch => ch.trim()) : []
            };

            // If we found valid .env credentials, migrate them
            if (config.clientId && config.clientId !== 'your_client_id_here') {
                console.log('🔄 Migrating .env credentials to secure storage...');
                await SecureCredentials.saveCredentials(config);
            }
        } else if (global.currentCredentials) {
            // Use globally stored credentials from startup check
            config = global.currentCredentials;
        }

        // Debug logging
        console.log('🔍 Bot startup config check:');
        console.log(`Client ID: ${config.clientId ? 'SET' : 'MISSING'}`);
        console.log(`Client Secret: ${config.clientSecret ? 'SET' : 'MISSING'}`);
        console.log(`Access Token: ${config.accessToken ? 'SET' : 'MISSING'}`);
        console.log(`Refresh Token: ${config.refreshToken ? 'SET' : 'MISSING'}`);
        console.log(`Channels: ${config.channels.length > 0 ? config.channels.join(', ') : 'NONE'}`);

        if (!config.clientId || !config.clientSecret || !config.accessToken || !config.channels.length) {
            return { success: false, error: 'Missing required configuration. Please check your settings.' };
        }

        if (!config.refreshToken || config.refreshToken.trim() === '') {
            return { success: false, error: 'Refresh token is required. Please get new tokens from https://twitchtokengenerator.com/ and make sure to copy BOTH the Access Token AND Refresh Token.' };
        }

        bot = new TwitchBlackjackBot(config);

        // Load advertisement configuration from settings
        if (store) {
            const savedAdConfig = store.get('adConfig', null);
            if (savedAdConfig) {
                console.log('📢 Loading advertisement config from settings...');
                bot.setAdConfig(savedAdConfig);
                console.log('✅ Advertisement config loaded');
            } else {
                console.log('📢 Using default advertisement config');
                bot.setAdConfig(getDefaultAdConfig());
            }
        } else {
            console.log('📢 Using default advertisement config (no settings store)');
            bot.setAdConfig(getDefaultAdConfig());
        }

        // Set up bot event listeners
        setupBotEventListeners();

        await bot.connect();
        
        botStatus.connected = true;
        botStatus.channels = config.channels;
        botStatus.uptime = new Date();
        
        sendStatusUpdate();
        
        return { success: true };
    } catch (error) {
        bot = null;
        botStatus.connected = false;
        sendStatusUpdate();
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-bot', async () => {
    if (!bot) {
        return { success: false, error: 'Bot is not running' };
    }

    try {
        bot.disconnect();
        bot = null;
        
        botStatus.connected = false;
        botStatus.channels = [];
        botStatus.activeGames = 0;
        botStatus.uptime = null;
        
        sendStatusUpdate();
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-status', () => {
    return botStatus;
});

ipcMain.handle('get-games', () => {
    if (!bot) return [];

    const games = [];
    for (const [channel, game] of bot.games) {
        games.push({
            channel,
            state: game.gameState,
            playerCount: game.players.size,
            players: Array.from(game.players.keys())
        });
    }
    return games;
});

ipcMain.handle('get-stats-summary', () => {
    if (!bot || !bot.statsManager) return null;

    const totalStats = bot.statsManager.getTotalStats();
    return totalStats;
});

ipcMain.handle('get-channel-stats', (event, channel) => {
    if (!bot || !bot.statsManager) return [];

    // Get top 10 players by games played for the channel
    const leaderboard = bot.statsManager.getChannelLeaderboard(channel, 'games', 10);
    return leaderboard;
});

ipcMain.handle('get-ad-config', () => {
    try {
        // First try to get from running bot
        if (bot) {
            return bot.getAdConfig();
        }

        // If bot not running, get from persistent settings
        if (!store) {
            return getDefaultAdConfig();
        }

        const savedConfig = store.get('adConfig', null);
        return savedConfig || getDefaultAdConfig();
    } catch (error) {
        console.error('Error getting ad config:', error);
        return getDefaultAdConfig();
    }
});

ipcMain.handle('set-ad-config', async (event, config) => {
    try {
        console.log('💾 Saving advertisement configuration...');

        // Save to persistent settings first
        if (store) {
            const adConfigToSave = {
                enabled: config.enabled !== undefined ? config.enabled : true,
                intervalMinutes: config.intervalMinutes || 5,
                minMessagesSinceLastAd: config.minMessagesSinceLastAd || 10,
                lastUpdated: new Date().toISOString()
            };

            store.set('adConfig', adConfigToSave);
            console.log('✅ Advertisement config saved to OS settings');

            // Also save to .env file for compatibility
            await saveAdConfigToEnv(adConfigToSave);
        }

        // Also update running bot if available
        if (bot) {
            bot.setAdConfig(config);
            console.log('✅ Advertisement config applied to running bot');
        } else {
            console.log('ℹ️ Bot not running - config will be applied when bot starts');
        }

        return { success: true };
    } catch (error) {
        console.error('❌ Error saving ad config:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-ad-stats', () => {
    if (!bot) return {};
    return bot.getAdStats();
});

// Settings management IPC handlers
ipcMain.handle('get-settings-info', () => {
    try {
        if (!store) {
            return { success: false, error: 'Settings store not initialized' };
        }

        const credentials = store.get('credentials', null);
        return {
            success: true,
            hasBackup: !!credentials,
            lastUpdated: credentials ? credentials.lastUpdated : null,
            settingsPath: store.path
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clear-settings-backup', () => {
    try {
        if (!store) {
            return { success: false, error: 'Settings store not initialized' };
        }

        store.delete('credentials');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-ad-settings-info', () => {
    try {
        if (!store) {
            return { success: false, error: 'Settings store not initialized' };
        }

        const adConfig = store.get('adConfig', null);
        return {
            success: true,
            hasSettings: !!adConfig,
            lastUpdated: adConfig ? adConfig.lastUpdated : null,
            currentConfig: adConfig || getDefaultAdConfig(),
            settingsPath: store.path
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-security-info', async () => {
    try {
        const credentials = await SecureCredentials.loadCredentials();
        const hasSecureCredentials = store ? !!store.get('secureCredentials', null) : false;
        const hasLegacyCredentials = store ? !!store.get('credentials', null) : false;

        return {
            success: true,
            safeStorageAvailable: safeStorage.isEncryptionAvailable(),
            usingSecureStorage: !!(credentials && credentials.version && credentials.version.startsWith('2.')),
            hasSecureCredentials,
            hasLegacyCredentials,
            storageVersion: credentials ? credentials.version : null,
            lastUpdated: credentials ? credentials.lastUpdated : null,
            settingsPath: store ? store.path : null
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('migrate-to-secure-storage', async () => {
    try {
        console.log('🔄 Manual migration to secure storage requested...');

        const migrated = await SecureCredentials.migrateCredentials();
        if (migrated) {
            console.log('✅ Manual migration completed');
            return { success: true, message: 'Credentials migrated to secure storage' };
        } else {
            console.log('ℹ️ No migration needed or migration failed');
            return { success: false, error: 'No credentials to migrate or migration failed' };
        }
    } catch (error) {
        console.error('❌ Manual migration failed:', error);
        return { success: false, error: error.message };
    }
});

// Authentication wizard IPC handlers
ipcMain.handle('open-twitch-console', async () => {
    try {
        await shell.openExternal('https://dev.twitch.tv/console/apps');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('start-auth-flow', async (event, { clientId, clientSecret }) => {
    try {
        const auth = getAuthService();
        const result = await auth.completeAuthFlow(clientId, clientSecret);

        return {
            success: true,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            scope: result.scope
        };
    } catch (error) {
        console.error('Auth flow error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-auth-config', async (event, config) => {
    try {
        console.log('🔐 Saving authentication configuration...');
        console.log('Config received:', {
            clientId: config.clientId ? 'SET' : 'MISSING',
            clientSecret: config.clientSecret ? 'SET' : 'MISSING',
            accessToken: config.accessToken ? 'SET' : 'MISSING',
            refreshToken: config.refreshToken ? 'SET' : 'MISSING',
            channels: config.channels ? config.channels.length : 0
        });

        // Save to secure storage (primary method)
        const secureResult = await SecureCredentials.saveCredentials(config);
        if (!secureResult.success) {
            console.warn('⚠️ Failed to save to secure storage:', secureResult.error);
            // Continue with fallback methods
        } else {
            console.log('✅ Saved to secure storage');
        }

        // Save to .env file as backup for compatibility
        const envResult = await saveConfigToEnv(config);
        if (!envResult.success) {
            console.warn('⚠️ Failed to save to .env file:', envResult.error);
            // Don't fail if .env save fails, secure storage is primary
        } else {
            console.log('✅ Saved to .env file (backup)');
        }

        // Store credentials globally for immediate use
        global.currentCredentials = config;

        // Reload environment variables for backward compatibility
        delete require.cache[require.resolve('dotenv')];
        require('dotenv').config();
        console.log('✅ Configuration updated');

        return { success: true };
    } catch (error) {
        console.error('❌ Failed to save auth config:', error);
        return { success: false, error: error.message };
    }
});

// Helper function to save config to OS settings
async function saveConfigToSettings(config) {
    try {
        if (!store) {
            throw new Error('Settings store not initialized');
        }

        const settingsData = {
            clientId: config.clientId || '',
            clientSecret: config.clientSecret || '',
            accessToken: config.accessToken || '',
            refreshToken: config.refreshToken || '',
            channels: config.channels || [],
            lastUpdated: new Date().toISOString(),
            version: '1.0.0'
        };

        store.set('credentials', settingsData);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper function to load config from OS settings
function loadConfigFromSettings() {
    try {
        if (!store) {
            return null;
        }

        return store.get('credentials', null);
    } catch (error) {
        console.warn('Failed to load from OS settings:', error.message);
        return null;
    }
}

// Secure credential storage using Electron's safeStorage API
const SecureCredentials = {
    // Save credentials securely using safeStorage
    async saveCredentials(credentials) {
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                console.warn('⚠️ Encryption not available, falling back to electron-store');
                return this.saveCredentialsToStore(credentials);
            }

            const credentialsJson = JSON.stringify({
                clientId: credentials.clientId || '',
                clientSecret: credentials.clientSecret || '',
                accessToken: credentials.accessToken || '',
                refreshToken: credentials.refreshToken || '',
                channels: credentials.channels || [],
                lastUpdated: new Date().toISOString(),
                version: '2.0.0' // Version 2.0.0 indicates safeStorage format
            });

            const encryptedCredentials = safeStorage.encryptString(credentialsJson);

            if (!store) {
                throw new Error('Settings store not initialized');
            }

            // Store the encrypted buffer as base64
            store.set('secureCredentials', encryptedCredentials.toString('base64'));
            console.log('🔐 Credentials encrypted and saved using safeStorage');

            return { success: true };
        } catch (error) {
            console.error('❌ Failed to save secure credentials:', error);
            return { success: false, error: error.message };
        }
    },

    // Load credentials securely using safeStorage
    async loadCredentials() {
        try {
            if (!store) {
                return null;
            }

            // First try to load from new secure format
            const encryptedData = store.get('secureCredentials', null);
            if (encryptedData) {
                if (!safeStorage.isEncryptionAvailable()) {
                    console.warn('⚠️ Encryption not available, cannot decrypt credentials');
                    return this.loadCredentialsFromStore();
                }

                try {
                    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
                    const decryptedJson = safeStorage.decryptString(encryptedBuffer);
                    const credentials = JSON.parse(decryptedJson);

                    console.log('🔐 Credentials loaded and decrypted using safeStorage');
                    return credentials;
                } catch (decryptError) {
                    console.warn('⚠️ Failed to decrypt credentials, falling back to store:', decryptError.message);
                    return this.loadCredentialsFromStore();
                }
            }

            // Fallback to old format
            return this.loadCredentialsFromStore();
        } catch (error) {
            console.error('❌ Failed to load secure credentials:', error);
            return null;
        }
    },

    // Fallback methods for electron-store
    saveCredentialsToStore(credentials) {
        try {
            if (!store) {
                throw new Error('Settings store not initialized');
            }

            const settingsData = {
                clientId: credentials.clientId || '',
                clientSecret: credentials.clientSecret || '',
                accessToken: credentials.accessToken || '',
                refreshToken: credentials.refreshToken || '',
                channels: credentials.channels || [],
                lastUpdated: new Date().toISOString(),
                version: '1.0.0' // Version 1.0.0 indicates electron-store format
            };

            store.set('credentials', settingsData);
            console.log('📦 Credentials saved to electron-store (fallback)');

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    loadCredentialsFromStore() {
        try {
            if (!store) {
                return null;
            }

            const credentials = store.get('credentials', null);
            if (credentials) {
                console.log('📦 Credentials loaded from electron-store (fallback)');
            }
            return credentials;
        } catch (error) {
            console.warn('Failed to load from electron-store:', error.message);
            return null;
        }
    },

    // Migrate old credentials to new secure format
    async migrateCredentials() {
        try {
            const oldCredentials = this.loadCredentialsFromStore();
            if (oldCredentials && safeStorage.isEncryptionAvailable()) {
                console.log('🔄 Migrating credentials to secure storage...');

                const result = await this.saveCredentials(oldCredentials);
                if (result.success) {
                    // Remove old credentials after successful migration
                    store.delete('credentials');
                    console.log('✅ Credentials migrated to secure storage');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Failed to migrate credentials:', error);
            return false;
        }
    }
};

// Helper function to get default advertisement configuration
function getDefaultAdConfig() {
    return {
        enabled: process.env.AD_ENABLED !== 'false', // Default to true unless explicitly disabled
        intervalMinutes: parseInt(process.env.AD_INTERVAL_MINUTES) || 5,
        minMessagesSinceLastAd: parseInt(process.env.AD_MIN_MESSAGES) || 10
    };
}

// Helper function to save advertisement config to .env file
async function saveAdConfigToEnv(adConfig) {
    try {
        if (!fs.existsSync('.env')) {
            console.log('⚠️ No .env file found, skipping ad config save to .env');
            return { success: true };
        }

        let envContent = fs.readFileSync('.env', 'utf8');

        // Update or add advertisement settings
        const adEnabled = adConfig.enabled ? 'true' : 'false';
        const adInterval = adConfig.intervalMinutes.toString();
        const adMinMessages = adConfig.minMessagesSinceLastAd.toString();

        // Update existing values or add new ones
        if (envContent.includes('AD_ENABLED=')) {
            envContent = envContent.replace(/^AD_ENABLED=.*$/m, `AD_ENABLED=${adEnabled}`);
        } else {
            envContent += `\n# Advertisement Settings\nAD_ENABLED=${adEnabled}`;
        }

        if (envContent.includes('AD_INTERVAL_MINUTES=')) {
            envContent = envContent.replace(/^AD_INTERVAL_MINUTES=.*$/m, `AD_INTERVAL_MINUTES=${adInterval}`);
        } else {
            envContent += `\nAD_INTERVAL_MINUTES=${adInterval}`;
        }

        if (envContent.includes('AD_MIN_MESSAGES=')) {
            envContent = envContent.replace(/^AD_MIN_MESSAGES=.*$/m, `AD_MIN_MESSAGES=${adMinMessages}`);
        } else {
            envContent += `\nAD_MIN_MESSAGES=${adMinMessages}`;
        }

        fs.writeFileSync('.env', envContent);
        console.log('✅ Advertisement config saved to .env file');

        return { success: true };
    } catch (error) {
        console.error('❌ Error saving ad config to .env:', error);
        return { success: false, error: error.message };
    }
}

// Helper function to save config (extracted from existing save-config handler)
async function saveConfigToEnv(config) {
    try {
        let envContent = '';

        // Try to read existing .env file to preserve comments and structure
        if (fs.existsSync('.env')) {
            envContent = fs.readFileSync('.env', 'utf8');
        } else {
            // If no .env exists, use .env.example as template
            if (fs.existsSync('.env.example')) {
                envContent = fs.readFileSync('.env.example', 'utf8');
            } else {
                // Fallback to basic template
                envContent = `# Twitch Bot Configuration
# Generated by Authentication Wizard

# Your Twitch application's Client ID
TWITCH_CLIENT_ID=your_client_id_here

# Your Twitch application's Client Secret
TWITCH_CLIENT_SECRET=your_client_secret_here

# Your Twitch access token
TWITCH_ACCESS_TOKEN=your_access_token_here

# Your Twitch refresh token (for automatic token renewal)
TWITCH_REFRESH_TOKEN=your_refresh_token_here

# Comma-separated list of channels to join (without # prefix)
CHANNELS=your_channel_name

# Advertisement Settings (optional)
AD_ENABLED=true
AD_INTERVAL_MINUTES=5
AD_MIN_MESSAGES=10
`;
            }
        }

        // Update only the values that were provided (not empty)
        if (config.clientId && config.clientId.trim()) {
            if (envContent.includes('TWITCH_CLIENT_ID=')) {
                envContent = envContent.replace(/^TWITCH_CLIENT_ID=.*$/m, `TWITCH_CLIENT_ID=${config.clientId}`);
            } else {
                envContent += `\nTWITCH_CLIENT_ID=${config.clientId}`;
            }
        }

        if (config.clientSecret && config.clientSecret.trim()) {
            if (envContent.includes('TWITCH_CLIENT_SECRET=')) {
                envContent = envContent.replace(/^TWITCH_CLIENT_SECRET=.*$/m, `TWITCH_CLIENT_SECRET=${config.clientSecret}`);
            } else {
                envContent += `\nTWITCH_CLIENT_SECRET=${config.clientSecret}`;
            }
        }

        if (config.accessToken && config.accessToken.trim()) {
            if (envContent.includes('TWITCH_ACCESS_TOKEN=')) {
                envContent = envContent.replace(/^TWITCH_ACCESS_TOKEN=.*$/m, `TWITCH_ACCESS_TOKEN=${config.accessToken}`);
            } else {
                envContent += `\nTWITCH_ACCESS_TOKEN=${config.accessToken}`;
            }
        }

        if (config.refreshToken !== undefined) {
            if (config.refreshToken && config.refreshToken.trim()) {
                if (envContent.includes('TWITCH_REFRESH_TOKEN=')) {
                    envContent = envContent.replace(/^TWITCH_REFRESH_TOKEN=.*$/m, `TWITCH_REFRESH_TOKEN=${config.refreshToken}`);
                } else {
                    envContent += `\nTWITCH_REFRESH_TOKEN=${config.refreshToken}`;
                }
            } else {
                // If refresh token is empty, keep the line but clear the value
                if (envContent.includes('TWITCH_REFRESH_TOKEN=')) {
                    envContent = envContent.replace(/^TWITCH_REFRESH_TOKEN=.*$/m, 'TWITCH_REFRESH_TOKEN=');
                }
            }
        }

        if (config.channels && Array.isArray(config.channels)) {
            const channelsValue = config.channels.filter(ch => ch.trim()).join(',');
            if (envContent.includes('CHANNELS=')) {
                envContent = envContent.replace(/^CHANNELS=.*$/m, `CHANNELS=${channelsValue}`);
            } else {
                envContent += `\nCHANNELS=${channelsValue}`;
            }
        }

        console.log('📝 Writing .env file with content length:', envContent.length);
        fs.writeFileSync('.env', envContent);
        console.log('✅ .env file written successfully');

        return { success: true };
    } catch (error) {
        console.error('❌ Error writing .env file:', error);
        return { success: false, error: error.message };
    }
}

function setupBotEventListeners() {
    if (!bot) return;

    // Override sendMessage to track activity
    const originalSendMessage = bot.sendMessage.bind(bot);
    bot.sendMessage = async (channel, message) => {
        botStatus.lastActivity = new Date();
        botStatus.totalCommands++;
        sendStatusUpdate();
        return originalSendMessage(channel, message);
    };

    // Track active games
    setInterval(() => {
        if (bot) {
            botStatus.activeGames = bot.games.size;
            sendStatusUpdate();
        }
    }, 5000);
}

function sendStatusUpdate() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('status-update', botStatus);
    }
}

// Handle app updates
ipcMain.handle('check-for-updates', async () => {
    // Placeholder for future update functionality
    return { hasUpdate: false };
});

// Export logs
ipcMain.handle('export-logs', async () => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Export Logs',
            defaultPath: `blackjack-bot-logs-${new Date().toISOString().split('T')[0]}.txt`,
            filters: [
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            const logs = `Twitch Blackjack Bot Logs
Generated: ${new Date().toISOString()}
Status: ${botStatus.connected ? 'Connected' : 'Disconnected'}
Channels: ${botStatus.channels.join(', ')}
Active Games: ${botStatus.activeGames}
Total Commands: ${botStatus.totalCommands}
Uptime: ${botStatus.uptime ? new Date() - botStatus.uptime : 'N/A'}ms
Last Activity: ${botStatus.lastActivity || 'N/A'}
`;
            
            fs.writeFileSync(result.filePath, logs);
            return { success: true, path: result.filePath };
        }
        
        return { success: false, error: 'Export cancelled' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
