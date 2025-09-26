const express = require('express');
const { shell } = require('electron');
const crypto = require('crypto');

class AuthService {
    constructor() {
        this.app = null;
        this.server = null;
        this.port = 3000;
        this.authState = null;
        this.pendingAuth = null;
        this.isListening = false;
    }

    // Start the local server for OAuth callback
    async startServer() {
        if (this.isListening) {
            return { success: true, port: this.port };
        }

        return new Promise((resolve) => {
            this.app = express();
            
            // Serve a simple callback page
            this.app.get('/auth/callback', (req, res) => {
                const { code, state, error } = req.query;
                
                if (error) {
                    res.send(`
                        <html>
                            <head><title>Authentication Error</title></head>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1 style="color: #e53e3e;">Authentication Failed</h1>
                                <p>Error: ${error}</p>
                                <p>Please close this window and try again.</p>
                            </body>
                        </html>
                    `);
                    
                    if (this.pendingAuth) {
                        this.pendingAuth.reject(new Error(`Authentication failed: ${error}`));
                        this.pendingAuth = null;
                    }
                    return;
                }

                if (state !== this.authState) {
                    res.send(`
                        <html>
                            <head><title>Authentication Error</title></head>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1 style="color: #e53e3e;">Authentication Failed</h1>
                                <p>Invalid state parameter. This might be a security issue.</p>
                                <p>Please close this window and try again.</p>
                            </body>
                        </html>
                    `);
                    
                    if (this.pendingAuth) {
                        this.pendingAuth.reject(new Error('Invalid state parameter'));
                        this.pendingAuth = null;
                    }
                    return;
                }

                res.send(`
                    <html>
                        <head><title>Authentication Successful</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                            <h1 style="color: #38a169;">Authentication Successful! 🎉</h1>
                            <p>You can now close this window and return to the Twitch Blackjack Bot.</p>
                            <p>The bot will automatically retrieve your access tokens.</p>
                            <script>
                                // Auto-close after 3 seconds
                                setTimeout(() => {
                                    window.close();
                                }, 3000);
                            </script>
                        </body>
                    </html>
                `);

                if (this.pendingAuth) {
                    this.pendingAuth.resolve({ code, state });
                    this.pendingAuth = null;
                }
            });

            // Health check endpoint
            this.app.get('/health', (req, res) => {
                res.json({ status: 'ok', service: 'Twitch Blackjack Bot Auth' });
            });

            // Try to start server on the preferred port, or find an available one
            this.server = this.app.listen(this.port, () => {
                this.isListening = true;
                console.log(`🔐 Auth server started on http://localhost:${this.port}`);
                resolve({ success: true, port: this.port });
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    // Try next port
                    this.port++;
                    if (this.port > 3010) {
                        resolve({ success: false, error: 'Could not find available port' });
                        return;
                    }
                    this.server = this.app.listen(this.port, () => {
                        this.isListening = true;
                        console.log(`🔐 Auth server started on http://localhost:${this.port}`);
                        resolve({ success: true, port: this.port });
                    });
                } else {
                    resolve({ success: false, error: err.message });
                }
            });
        });
    }

    // Stop the local server
    async stopServer() {
        if (this.server && this.isListening) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isListening = false;
                    console.log('🔐 Auth server stopped');
                    resolve();
                });
            });
        }
    }

    // Generate OAuth URL and open browser
    async initiateAuth(clientId, scopes = ['chat:read', 'chat:edit']) {
        if (!clientId) {
            throw new Error('Client ID is required');
        }

        // Start server if not already running
        const serverResult = await this.startServer();
        if (!serverResult.success) {
            throw new Error(`Failed to start auth server: ${serverResult.error}`);
        }

        // Generate state for security
        this.authState = crypto.randomBytes(16).toString('hex');

        const redirectUri = `http://localhost:${this.port}/auth/callback`;
        const scopeString = scopes.join(' ');
        
        const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scopeString)}&` +
            `state=${this.authState}`;

        console.log('🔐 Opening Twitch authorization URL...');
        
        // Open the URL in the default browser
        await shell.openExternal(authUrl);

        // Return a promise that resolves when the callback is received
        return new Promise((resolve, reject) => {
            this.pendingAuth = { resolve, reject };
            
            // Set a timeout for the auth process (5 minutes)
            setTimeout(() => {
                if (this.pendingAuth) {
                    this.pendingAuth.reject(new Error('Authentication timeout'));
                    this.pendingAuth = null;
                }
            }, 5 * 60 * 1000);
        });
    }

    // Exchange authorization code for access token
    async exchangeCodeForTokens(clientId, clientSecret, code) {
        const redirectUri = `http://localhost:${this.port}/auth/callback`;
        
        const tokenUrl = 'https://id.twitch.tv/oauth2/token';
        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        });

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
            }

            const tokenData = await response.json();
            
            return {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresIn: tokenData.expires_in,
                scope: tokenData.scope
            };
        } catch (error) {
            throw new Error(`Failed to exchange code for tokens: ${error.message}`);
        }
    }

    // Validate tokens by making a test API call
    async validateTokens(accessToken) {
        try {
            const response = await fetch('https://api.twitch.tv/helix/users', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': 'your-client-id' // This will be replaced with actual client ID
                }
            });

            if (response.ok) {
                const userData = await response.json();
                return {
                    valid: true,
                    user: userData.data[0]
                };
            } else {
                return { valid: false, error: `API call failed: ${response.status}` };
            }
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Complete authentication flow
    async completeAuthFlow(clientId, clientSecret) {
        try {
            // Step 1: Initiate OAuth flow
            const authResult = await this.initiateAuth(clientId);
            
            // Step 2: Exchange code for tokens
            const tokens = await this.exchangeCodeForTokens(clientId, clientSecret, authResult.code);
            
            // Step 3: Stop the server
            await this.stopServer();
            
            return {
                success: true,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn,
                scope: tokens.scope
            };
        } catch (error) {
            // Make sure to stop server on error
            await this.stopServer();
            throw error;
        }
    }
}

module.exports = AuthService;
