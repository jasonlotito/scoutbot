// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.isConnected = false;
        this.statusUpdateInterval = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadConfig();
        this.startStatusUpdates();
        await this.updateSecurityInfo();
        this.addLog('Dashboard initialized', 'success');
    }

    setupEventListeners() {
        // Control buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startBot());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopBot());
        document.getElementById('config-btn').addEventListener('click', () => this.openConfigModal());
        document.getElementById('create-env-btn').addEventListener('click', () => this.createEnvFile());

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('cancel-config').addEventListener('click', () => this.closeConfigModal());
        document.getElementById('save-config').addEventListener('click', () => this.saveConfig());

        // Activity log controls
        document.getElementById('clear-log-btn').addEventListener('click', () => this.clearLog());
        document.getElementById('export-logs-btn').addEventListener('click', () => this.exportLogs());

        // Advertisement settings
        document.getElementById('ad-settings-btn').addEventListener('click', () => this.openAdModal());
        document.getElementById('close-ad-modal').addEventListener('click', () => this.closeAdModal());
        document.getElementById('cancel-ad-settings').addEventListener('click', () => this.closeAdModal());
        document.getElementById('save-ad-settings').addEventListener('click', () => this.saveAdSettings());

        // Security information
        document.getElementById('security-info-btn').addEventListener('click', () => this.openSecurityModal());
        document.getElementById('close-security-modal').addEventListener('click', () => this.closeSecurityModal());
        document.getElementById('close-security-info').addEventListener('click', () => this.closeSecurityModal());
        document.getElementById('migrate-storage-btn').addEventListener('click', () => this.migrateToSecureStorage());
        document.getElementById('force-migrate-btn').addEventListener('click', () => this.migrateToSecureStorage());

        // Authentication wizard
        document.getElementById('open-twitch-console').addEventListener('click', () => this.openTwitchConsole());
        document.getElementById('auth-wizard-cancel').addEventListener('click', () => this.closeAuthWizard());
        document.getElementById('auth-wizard-back').addEventListener('click', () => this.authWizardBack());
        document.getElementById('auth-wizard-next').addEventListener('click', () => this.authWizardNext());

        // Modal backdrop click
        document.getElementById('config-modal').addEventListener('click', (e) => {
            if (e.target.id === 'config-modal') {
                this.closeConfigModal();
            }
        });

        document.getElementById('ad-modal').addEventListener('click', (e) => {
            if (e.target.id === 'ad-modal') {
                this.closeAdModal();
            }
        });

        document.getElementById('auth-wizard-modal').addEventListener('click', (e) => {
            if (e.target.id === 'auth-wizard-modal') {
                // Don't allow closing wizard by clicking backdrop - user must complete or cancel
            }
        });

        // Status updates from main process
        window.electronAPI.onStatusUpdate((event, status) => {
            this.updateStatus(status);
        });

        // Authentication wizard trigger
        window.electronAPI.onShowAuthWizard(() => {
            this.showAuthWizard();
        });

        // Credential recovery notification
        window.electronAPI.onCredentialsRecovered(() => {
            this.showToast('Credentials recovered from system settings!', 'success');
            setTimeout(() => {
                location.reload();
            }, 2000);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.openConfigModal();
                        break;
                    case 'r':
                        e.preventDefault();
                        if (this.isConnected) {
                            this.stopBot();
                        } else {
                            this.startBot();
                        }
                        break;
                }
            }
        });
    }

    async loadConfig() {
        try {
            const config = await window.electronAPI.getConfig();

            // Update form fields
            document.getElementById('client-id').value = config.clientId || '';
            document.getElementById('channels').value = config.channels.join(',');

            // Show status for sensitive fields
            const clientSecretField = document.getElementById('client-secret');
            const accessTokenField = document.getElementById('access-token');
            const refreshTokenField = document.getElementById('refresh-token');

            if (config.hasClientSecret) {
                clientSecretField.placeholder = '***configured*** (leave empty to keep current)';
                clientSecretField.value = '';
            } else {
                clientSecretField.placeholder = 'Enter your client secret';
                clientSecretField.value = '';
            }

            if (config.hasAccessToken) {
                accessTokenField.placeholder = '***configured*** (leave empty to keep current)';
                accessTokenField.value = '';
            } else {
                accessTokenField.placeholder = 'Enter your access token';
                accessTokenField.value = '';
            }

            if (config.hasRefreshToken) {
                refreshTokenField.placeholder = '***configured*** (leave empty to keep current)';
                refreshTokenField.value = '';
            } else {
                refreshTokenField.placeholder = 'Enter refresh token (optional)';
                refreshTokenField.value = '';
            }

            // Show configuration status and create .env button if needed
            const createEnvBtn = document.getElementById('create-env-btn');
            if (config.envFileExists) {
                this.addLog('Configuration loaded from .env file');
                createEnvBtn.style.display = 'none';
            } else {
                this.addLog('No .env file found - click "Create .env File" to get started', 'warning');
                createEnvBtn.style.display = 'inline-block';
            }

            // Validate configuration completeness
            const isComplete = config.hasClientId && config.hasClientSecret && config.hasAccessToken && config.channels.length > 0;
            if (!isComplete && config.envFileExists) {
                this.addLog('Configuration incomplete - please fill in all required fields', 'warning');
            }

        } catch (error) {
            this.addLog(`Failed to load configuration: ${error.message}`, 'error');
        }
    }

    async startBot() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        startBtn.disabled = true;
        startBtn.textContent = 'Starting...';
        
        try {
            const result = await window.electronAPI.startBot();
            
            if (result.success) {
                this.isConnected = true;
                startBtn.style.display = 'none';
                stopBtn.style.display = 'inline-block';
                stopBtn.disabled = false;
                
                this.showToast('Bot started successfully!', 'success');
                this.addLog('Bot started and connected to Twitch', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showToast(`Failed to start bot: ${error.message}`, 'error');
            this.addLog(`Failed to start bot: ${error.message}`, 'error');
        } finally {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Bot';
        }
    }

    async stopBot() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping...';
        
        try {
            const result = await window.electronAPI.stopBot();
            
            if (result.success) {
                this.isConnected = false;
                stopBtn.style.display = 'none';
                startBtn.style.display = 'inline-block';
                startBtn.disabled = false;
                
                this.showToast('Bot stopped successfully!', 'success');
                this.addLog('Bot stopped and disconnected', 'warning');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showToast(`Failed to stop bot: ${error.message}`, 'error');
            this.addLog(`Failed to stop bot: ${error.message}`, 'error');
        } finally {
            stopBtn.disabled = false;
            stopBtn.textContent = 'Stop Bot';
        }
    }

    openConfigModal() {
        document.getElementById('config-modal').style.display = 'block';
    }

    closeConfigModal() {
        document.getElementById('config-modal').style.display = 'none';
    }

    async createEnvFile() {
        try {
            const result = await window.electronAPI.createEnvFile();

            if (result.success) {
                this.showToast('.env file created successfully!', 'success');
                this.addLog('.env file created from template', 'success');
                await this.loadConfig();
                this.openConfigModal(); // Open settings to fill in values
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showToast(`Failed to create .env file: ${error.message}`, 'error');
            this.addLog(`Failed to create .env file: ${error.message}`, 'error');
        }
    }

    async saveConfig() {
        const form = document.getElementById('config-form');
        const formData = new FormData(form);

        const config = {
            clientId: formData.get('clientId').trim(),
            clientSecret: formData.get('clientSecret').trim(),
            accessToken: formData.get('accessToken').trim(),
            refreshToken: formData.get('refreshToken').trim(),
            channels: formData.get('channels').split(',').map(ch => ch.trim()).filter(ch => ch)
        };

        // Validate required fields
        if (!config.clientId) {
            this.showToast('Client ID is required', 'error');
            return;
        }

        if (!config.channels.length) {
            this.showToast('At least one channel is required', 'error');
            return;
        }

        // Note: Empty password fields will be handled by the main process
        // (it won't overwrite existing values if the field is empty)

        try {
            const result = await window.electronAPI.saveConfig(config);

            if (result.success) {
                this.showToast('Configuration saved successfully!', 'success');
                this.addLog('Configuration updated and saved to .env file', 'success');
                this.closeConfigModal();
                await this.loadConfig();

                // Suggest restarting bot if it's currently running
                if (this.isConnected) {
                    this.showToast('Configuration updated. Consider restarting the bot to apply changes.', 'warning');
                    this.addLog('Bot restart recommended to apply new configuration', 'warning');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showToast(`Failed to save configuration: ${error.message}`, 'error');
            this.addLog(`Failed to save configuration: ${error.message}`, 'error');
        }
    }

    updateStatus(status) {
        // Connection status
        const statusDot = document.getElementById('connection-status');
        const statusText = document.getElementById('connection-text');
        
        if (status.connected) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Disconnected';
        }

        // Stats
        document.getElementById('uptime').textContent = status.uptime ? 
            this.formatUptime(new Date() - new Date(status.uptime)) : '--';
        document.getElementById('channels-count').textContent = status.channels.length;
        document.getElementById('active-games').textContent = status.activeGames;
        document.getElementById('total-commands').textContent = status.totalCommands;

        // Channels list
        this.updateChannelsList(status.channels);
        
        // Update games list, stats, and ads
        this.updateGamesList();
        this.updateStats();
        this.updateAdSystem();
    }

    updateChannelsList(channels) {
        const channelsList = document.getElementById('channels-list');
        
        if (channels.length === 0) {
            channelsList.innerHTML = '<p class="empty-state">No channels connected</p>';
        } else {
            channelsList.innerHTML = channels.map(channel => 
                `<div class="channel-item">
                    <span>#${channel}</span>
                    <span class="status-badge">Connected</span>
                </div>`
            ).join('');
        }
    }

    async updateGamesList() {
        try {
            const games = await window.electronAPI.getGames();
            const gamesList = document.getElementById('games-list');

            if (games.length === 0) {
                gamesList.innerHTML = '<p class="empty-state">No active games</p>';
            } else {
                gamesList.innerHTML = games.map(game =>
                    `<div class="game-item">
                        <div>
                            <strong>${game.channel}</strong>
                            <br>
                            <small>${game.playerCount} players • ${game.state}</small>
                        </div>
                        <div class="game-players">
                            ${game.players.slice(0, 3).join(', ')}${game.players.length > 3 ? '...' : ''}
                        </div>
                    </div>`
                ).join('');
            }
        } catch (error) {
            console.error('Failed to update games list:', error);
        }
    }

    async updateStats() {
        try {
            const statsSummary = await window.electronAPI.getStatsSummary();

            if (statsSummary) {
                document.getElementById('total-players').textContent = statsSummary.totalPlayers;
                document.getElementById('total-games-played').textContent = statsSummary.totalGames;
            } else {
                document.getElementById('total-players').textContent = '0';
                document.getElementById('total-games-played').textContent = '0';
            }

            // Update top players (for now, just show a message)
            const topPlayersDiv = document.getElementById('top-players');
            if (statsSummary && statsSummary.totalPlayers > 0) {
                topPlayersDiv.innerHTML = `
                    <div class="player-stat-item">
                        <div class="player-name">📊 Statistics Available</div>
                        <div class="player-stats">Use !stats, !mystats, !leaderboard in chat</div>
                    </div>
                `;
            } else {
                topPlayersDiv.innerHTML = '<p class="empty-state">No player data available</p>';
            }
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    async updateAdSystem() {
        try {
            const adConfig = await window.electronAPI.getAdConfig();
            const adStats = await window.electronAPI.getAdStats();

            if (adConfig) {
                // Update status
                const statusElement = document.getElementById('ad-status');
                const statusTextElement = document.getElementById('ad-status-text');

                if (adConfig.enabled) {
                    statusElement.className = 'status-indicator online';
                    statusTextElement.textContent = 'Enabled';
                } else {
                    statusElement.className = 'status-indicator offline';
                    statusTextElement.textContent = 'Disabled';
                }

                // Update config display
                document.getElementById('ad-interval').textContent = adConfig.intervalMinutes;
                document.getElementById('ad-min-messages').textContent = adConfig.minMessagesSinceLastAd;

                // Update channel stats
                const channelStatsDiv = document.getElementById('ad-channel-stats');
                if (adStats && Object.keys(adStats).length > 0) {
                    channelStatsDiv.innerHTML = Object.entries(adStats).map(([channel, stats]) => {
                        const nextAdMinutes = Math.ceil(stats.nextAdIn / (1000 * 60));
                        const timeSinceLastAd = Math.floor(stats.timeSinceLastAd / (1000 * 60));

                        return `
                            <div class="ad-channel-item">
                                <div class="channel-name">${channel}</div>
                                <div class="channel-stats">
                                    ${stats.messagesSinceLastAd} msgs |
                                    Last ad: ${timeSinceLastAd}m ago |
                                    Next: ${nextAdMinutes > 0 ? `${nextAdMinutes}m` : 'Ready'}
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    channelStatsDiv.innerHTML = '<p class="empty-state">No advertisement data available</p>';
                }
            }
        } catch (error) {
            console.error('Failed to update ad system:', error);
        }
    }

    async openAdModal() {
        try {
            const adConfig = await window.electronAPI.getAdConfig();

            if (adConfig) {
                // Populate form with current values
                document.getElementById('ad-enabled').checked = adConfig.enabled;
                document.getElementById('ad-interval-input').value = adConfig.intervalMinutes;
                document.getElementById('ad-min-messages-input').value = adConfig.minMessagesSinceLastAd;
            }

            document.getElementById('ad-modal').style.display = 'block';
        } catch (error) {
            console.error('Failed to load ad config:', error);
            this.showToast('Failed to load advertisement settings', 'error');
        }
    }

    closeAdModal() {
        document.getElementById('ad-modal').style.display = 'none';
    }

    async saveAdSettings() {
        try {
            const formData = new FormData(document.getElementById('ad-settings-form'));
            const config = {
                enabled: formData.get('enabled') === 'on',
                intervalMinutes: parseInt(formData.get('intervalMinutes')),
                minMessagesSinceLastAd: parseInt(formData.get('minMessagesSinceLastAd'))
            };

            const result = await window.electronAPI.setAdConfig(config);

            if (result.success) {
                const botStatus = this.botStatus?.connected ? 'Applied to running bot' : 'Saved - will apply when bot starts';
                this.showToast(`Advertisement settings saved successfully! ${botStatus}`, 'success');
                this.closeAdModal();
                this.updateAdSystem(); // Refresh the display
            } else {
                this.showToast(`Failed to save settings: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Failed to save ad settings:', error);
            this.showToast('Failed to save advertisement settings', 'error');
        }
    }

    // Authentication Wizard Methods
    showAuthWizard() {
        this.authWizardStep = 1;
        this.authWizardData = {
            clientId: '',
            clientSecret: '',
            accessToken: '',
            refreshToken: '',
            channels: []
        };

        this.updateAuthWizardStep();
        document.getElementById('auth-wizard-modal').style.display = 'block';
    }

    closeAuthWizard() {
        document.getElementById('auth-wizard-modal').style.display = 'none';
        this.authWizardStep = 1;
        this.authWizardData = {};
    }

    updateAuthWizardStep() {
        // Update progress indicators
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            const stepNumber = index + 1;
            step.classList.remove('active', 'completed');

            if (stepNumber < this.authWizardStep) {
                step.classList.add('completed');
            } else if (stepNumber === this.authWizardStep) {
                step.classList.add('active');
            }
        });

        document.querySelectorAll('.progress-line').forEach((line, index) => {
            line.classList.remove('completed');
            if (index + 1 < this.authWizardStep) {
                line.classList.add('completed');
            }
        });

        // Show/hide steps
        document.querySelectorAll('.auth-step').forEach((step, index) => {
            step.classList.remove('active');
            if (index + 1 === this.authWizardStep) {
                step.classList.add('active');
            }
        });

        // Update buttons
        const backBtn = document.getElementById('auth-wizard-back');
        const nextBtn = document.getElementById('auth-wizard-next');

        backBtn.style.display = this.authWizardStep > 1 ? 'inline-block' : 'none';

        if (this.authWizardStep === 1) {
            nextBtn.textContent = 'Next';
            nextBtn.disabled = false;
        } else if (this.authWizardStep === 2) {
            nextBtn.textContent = 'Authorize Bot';
            nextBtn.disabled = false;
        } else if (this.authWizardStep === 3) {
            nextBtn.textContent = 'Complete Setup';
            nextBtn.disabled = false;
        }
    }

    async openTwitchConsole() {
        try {
            await window.electronAPI.openTwitchConsole();
            this.showToast('Opened Twitch Developer Console in your browser', 'info');
        } catch (error) {
            this.showToast('Failed to open Twitch console', 'error');
        }
    }

    authWizardBack() {
        if (this.authWizardStep > 1) {
            this.authWizardStep--;
            this.updateAuthWizardStep();
        }
    }

    async authWizardNext() {
        if (this.authWizardStep === 1) {
            // Validate step 1 - client credentials
            const clientId = document.getElementById('wizard-client-id').value.trim();
            const clientSecret = document.getElementById('wizard-client-secret').value.trim();

            if (!clientId || !clientSecret) {
                this.showToast('Please enter both Client ID and Client Secret', 'error');
                return;
            }

            this.authWizardData.clientId = clientId;
            this.authWizardData.clientSecret = clientSecret;

            // Update summary
            document.getElementById('summary-client-id').textContent = clientId.substring(0, 8) + '...';

            this.authWizardStep = 2;
            this.updateAuthWizardStep();

        } else if (this.authWizardStep === 2) {
            // Start OAuth flow
            await this.startAuthFlow();

        } else if (this.authWizardStep === 3) {
            // Complete setup
            await this.completeAuthSetup();
        }
    }

    async startAuthFlow() {
        const nextBtn = document.getElementById('auth-wizard-next');
        const statusDiv = document.getElementById('auth-status');

        try {
            nextBtn.disabled = true;
            nextBtn.textContent = 'Authorizing...';

            // Update status
            statusDiv.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">🔄</span>
                    <span>Starting authorization flow...</span>
                </div>
            `;

            const result = await window.electronAPI.startAuthFlow({
                clientId: this.authWizardData.clientId,
                clientSecret: this.authWizardData.clientSecret
            });

            if (result.success) {
                this.authWizardData.accessToken = result.accessToken;
                this.authWizardData.refreshToken = result.refreshToken;

                statusDiv.innerHTML = `
                    <div class="status-item">
                        <span class="status-icon">✅</span>
                        <span>Authorization successful!</span>
                    </div>
                    <div class="status-item">
                        <span class="status-icon">🔑</span>
                        <span>Access token received</span>
                    </div>
                    <div class="status-item">
                        <span class="status-icon">🔄</span>
                        <span>Refresh token received</span>
                    </div>
                `;

                // Update summary
                document.getElementById('summary-auth-status').textContent = 'Authorized ✅';

                this.authWizardStep = 3;
                this.updateAuthWizardStep();

                this.showToast('Authorization successful!', 'success');

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Auth flow error:', error);

            statusDiv.innerHTML = `
                <div class="status-item">
                    <span class="status-icon">❌</span>
                    <span>Authorization failed: ${error.message}</span>
                </div>
            `;

            this.showToast(`Authorization failed: ${error.message}`, 'error');

        } finally {
            nextBtn.disabled = false;
            nextBtn.textContent = 'Retry Authorization';
        }
    }

    async completeAuthSetup() {
        const channels = document.getElementById('wizard-channels').value
            .split(',')
            .map(ch => ch.trim())
            .filter(ch => ch);

        if (channels.length === 0) {
            this.showToast('Please enter at least one channel', 'error');
            return;
        }

        this.authWizardData.channels = channels;

        // Update summary
        document.getElementById('summary-channels').textContent = channels.join(', ');

        try {
            const result = await window.electronAPI.saveAuthConfig(this.authWizardData);

            if (result.success) {
                this.showToast('Configuration saved successfully!', 'success');
                this.closeAuthWizard();

                // Refresh the main dashboard
                setTimeout(() => {
                    location.reload();
                }, 1000);

            } else {
                throw new Error(result.error);
            }

        } catch (error) {
            console.error('Failed to save config:', error);
            this.showToast(`Failed to save configuration: ${error.message}`, 'error');
        }
    }

    startStatusUpdates() {
        this.statusUpdateInterval = setInterval(async () => {
            try {
                const status = await window.electronAPI.getStatus();
                this.updateStatus(status);
            } catch (error) {
                console.error('Failed to get status:', error);
            }
        }, 2000);
    }

    addLog(message, type = 'info') {
        const log = document.getElementById('activity-log');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('p');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        log.appendChild(logEntry);
        log.scrollTop = log.scrollHeight;

        // Keep only last 100 entries
        while (log.children.length > 100) {
            log.removeChild(log.firstChild);
        }
    }

    clearLog() {
        document.getElementById('activity-log').innerHTML = '';
        this.addLog('Activity log cleared');
    }

    async exportLogs() {
        try {
            const result = await window.electronAPI.exportLogs();
            
            if (result.success) {
                this.showToast(`Logs exported to: ${result.path}`, 'success');
                this.addLog(`Logs exported to: ${result.path}`, 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.showToast(`Failed to export logs: ${error.message}`, 'error');
            this.addLog(`Failed to export logs: ${error.message}`, 'error');
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }

    async updateSecurityInfo() {
        try {
            const securityInfo = await window.electronAPI.getSecurityInfo();

            if (securityInfo.success) {
                // Update main dashboard display
                const storageMethod = document.getElementById('storage-method');
                const encryptionStatus = document.getElementById('encryption-status');
                const credentialsUpdated = document.getElementById('credentials-updated');
                const migrateBtn = document.getElementById('migrate-storage-btn');

                if (securityInfo.usingSecureStorage) {
                    storageMethod.textContent = 'Secure Storage';
                    storageMethod.className = 'security-value secure';
                } else {
                    storageMethod.textContent = 'Legacy Storage';
                    storageMethod.className = 'security-value legacy';
                    if (migrateBtn) migrateBtn.style.display = 'inline-block';
                }

                if (securityInfo.safeStorageAvailable) {
                    encryptionStatus.textContent = 'OS-Native';
                    encryptionStatus.className = 'security-value secure';
                } else {
                    encryptionStatus.textContent = 'Basic';
                    encryptionStatus.className = 'security-value warning';
                }

                if (securityInfo.lastUpdated) {
                    const date = new Date(securityInfo.lastUpdated);
                    credentialsUpdated.textContent = date.toLocaleDateString();
                } else {
                    credentialsUpdated.textContent = 'Unknown';
                }

                // Update modal details if open
                this.updateSecurityModalDetails(securityInfo);
            }
        } catch (error) {
            console.error('Failed to update security info:', error);
        }
    }

    updateSecurityModalDetails(securityInfo) {
        const detailStorageMethod = document.getElementById('detail-storage-method');
        const detailEncryptionStatus = document.getElementById('detail-encryption-status');
        const detailStorageVersion = document.getElementById('detail-storage-version');
        const detailLastUpdated = document.getElementById('detail-last-updated');
        const detailSettingsPath = document.getElementById('detail-settings-path');
        const forceMigrateBtn = document.getElementById('force-migrate-btn');

        if (detailStorageMethod) {
            detailStorageMethod.textContent = securityInfo.usingSecureStorage ?
                'OS Secure Storage (safeStorage API)' : 'Legacy electron-store';
        }

        if (detailEncryptionStatus) {
            detailEncryptionStatus.textContent = securityInfo.safeStorageAvailable ?
                'OS-Native Encryption Available' : 'Basic Encryption Only';
        }

        if (detailStorageVersion) {
            detailStorageVersion.textContent = securityInfo.storageVersion || 'Unknown';
        }

        if (detailLastUpdated) {
            if (securityInfo.lastUpdated) {
                const date = new Date(securityInfo.lastUpdated);
                detailLastUpdated.textContent = date.toLocaleString();
            } else {
                detailLastUpdated.textContent = 'Unknown';
            }
        }

        if (detailSettingsPath) {
            detailSettingsPath.textContent = securityInfo.settingsPath || 'Unknown';
        }

        if (forceMigrateBtn) {
            forceMigrateBtn.style.display = (!securityInfo.usingSecureStorage && securityInfo.hasLegacyCredentials) ?
                'inline-block' : 'none';
        }
    }

    openSecurityModal() {
        const modal = document.getElementById('security-modal');
        modal.style.display = 'block';
        this.updateSecurityInfo(); // Refresh data when opening
    }

    closeSecurityModal() {
        const modal = document.getElementById('security-modal');
        modal.style.display = 'none';
    }

    async migrateToSecureStorage() {
        try {
            this.showToast('Migrating credentials to secure storage...', 'info');

            const result = await window.electronAPI.migrateToSecureStorage();

            if (result.success) {
                this.showToast('Credentials successfully migrated to secure storage!', 'success');
                this.updateSecurityInfo(); // Refresh display
                this.addLog('Credentials migrated to secure storage', 'success');
            } else {
                this.showToast(`Migration failed: ${result.error}`, 'error');
                this.addLog(`Migration failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Failed to migrate to secure storage:', error);
            this.showToast(`Migration failed: ${error.message}`, 'error');
            this.addLog(`Migration failed: ${error.message}`, 'error');
        }
    }

    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
