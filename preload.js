const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Configuration
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    createEnvFile: () => ipcRenderer.invoke('create-env-file'),
    
    // Bot control
    startBot: () => ipcRenderer.invoke('start-bot'),
    stopBot: () => ipcRenderer.invoke('stop-bot'),
    
    // Status and monitoring
    getStatus: () => ipcRenderer.invoke('get-status'),
    getGames: () => ipcRenderer.invoke('get-games'),
    getStatsSummary: () => ipcRenderer.invoke('get-stats-summary'),
    getChannelStats: (channel) => ipcRenderer.invoke('get-channel-stats', channel),
    getAdConfig: () => ipcRenderer.invoke('get-ad-config'),
    setAdConfig: (config) => ipcRenderer.invoke('set-ad-config', config),
    getAdStats: () => ipcRenderer.invoke('get-ad-stats'),

    // Authentication wizard
    openTwitchConsole: () => ipcRenderer.invoke('open-twitch-console'),
    startAuthFlow: (credentials) => ipcRenderer.invoke('start-auth-flow', credentials),
    saveAuthConfig: (config) => ipcRenderer.invoke('save-auth-config', config),
    getSettingsInfo: () => ipcRenderer.invoke('get-settings-info'),
    clearSettingsBackup: () => ipcRenderer.invoke('clear-settings-backup'),
    getAdSettingsInfo: () => ipcRenderer.invoke('get-ad-settings-info'),

    onStatusUpdate: (callback) => ipcRenderer.on('status-update', callback),
    removeStatusListener: (callback) => ipcRenderer.removeListener('status-update', callback),
    onShowAuthWizard: (callback) => ipcRenderer.on('show-auth-wizard', callback),
    onCredentialsRecovered: (callback) => ipcRenderer.on('credentials-recovered', callback),
    
    // Utilities
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    exportLogs: () => ipcRenderer.invoke('export-logs'),
    
    // App info
    getVersion: () => process.env.npm_package_version || '1.0.0',
    getPlatform: () => process.platform
});
