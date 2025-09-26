const { RefreshingAuthProvider } = require('@twurple/auth');
const { ChatClient } = require('@twurple/chat');
const { BlackjackGame } = require('./blackjack');
const StatsManager = require('./statsManager');

class TwitchBlackjackBot {
    constructor(config) {
        this.config = config;
        this.games = new Map(); // channelName -> BlackjackGame
        this.authProvider = null;
        this.chatClient = null;
        this.statsManager = new StatsManager();

        // Advertisement system - load from environment or use defaults
        this.adConfig = {
            enabled: process.env.AD_ENABLED !== 'false', // Default true, set to 'false' to disable
            intervalMinutes: parseInt(process.env.AD_INTERVAL_MINUTES) || 5,
            minMessagesSinceLastAd: parseInt(process.env.AD_MIN_MESSAGES) || 10,
            messages: [
                "🃏 Want to play blackjack? Type !deal to start a game! Up to 6 players can join with !join. Try to get 21 without busting! 🎰",
                "🎲 Ready for some blackjack action? Use !deal to start, !join to play, !hit for cards, !stand to hold. Check your stats with !mystats! 📊",
                "♠️ Blackjack time! Start with !deal, join with !join, play with !hit/!stand. See who's winning with !leaderboard! 🏆",
                "🎯 Test your luck at blackjack! Commands: !deal (start), !join (play), !hit (card), !stand (hold), !stats (view stats) 🃏"
            ]
        };

        this.adState = new Map(); // channel -> { lastAdTime, messagesSinceAd, lastAdIndex }

        this.commands = {
            'deal': this.handleDeal.bind(this),
            'join': this.handleJoin.bind(this),
            'hit': this.handleHit.bind(this),
            'stand': this.handleStand.bind(this),
            'status': this.handleStatus.bind(this),
            'reset': this.handleReset.bind(this),
            'help': this.handleHelp.bind(this),
            'blackjack': this.handleHelp.bind(this),
            'stats': this.handleStats.bind(this),
            'mystats': this.handleMyStats.bind(this),
            'leaderboard': this.handleLeaderboard.bind(this),
            'lb': this.handleLeaderboard.bind(this)
        };
    }

    async connect() {
        try {
            // Validate configuration
            if (!this.config.refreshToken || this.config.refreshToken.trim() === '') {
                throw new Error('Refresh token is required but not provided. Please get a new token from https://twitchtokengenerator.com/');
            }

            // Create auth provider
            this.authProvider = new RefreshingAuthProvider({
                clientId: this.config.clientId,
                clientSecret: this.config.clientSecret
            });

            // Add user token with better error handling
            console.log('🔐 Adding user token to auth provider...');
            const tokenInfo = {
                accessToken: this.config.accessToken,
                refreshToken: this.config.refreshToken,
                scope: ['chat:read', 'chat:edit']
            };

            // Add the user token - Twurple will automatically determine the user ID
            await this.authProvider.addUserForToken(tokenInfo, ['chat']);

            console.log('✅ User token added successfully');
        } catch (error) {
            console.error('❌ Authentication setup failed:', error.message);
            if (error.message.includes('refresh token')) {
                console.error('🔧 Solution: Get new tokens from https://twitchtokengenerator.com/');
                console.error('   Make sure to copy BOTH the Access Token AND Refresh Token');
            }
            throw error;
        }

        // Create chat client
        this.chatClient = new ChatClient({
            authProvider: this.authProvider,
            channels: this.config.channels
        });

        // Register event handlers
        this.chatClient.onMessage((channel, user, text, msg) => {
            this.onMessageHandler(channel, user, text, msg);
        });

        this.chatClient.onConnect(() => {
            console.log('Connected to Twitch chat');
        });

        this.chatClient.onDisconnect((manually, reason) => {
            console.log(`Disconnected: ${reason} (manually: ${manually})`);
        });

        try {
            await this.chatClient.connect();
        } catch (error) {
            console.error('Failed to connect to Twitch:', error);
            throw error;
        }
    }

    onMessageHandler(channel, user, text, msg) {
        // Track messages for advertisement system
        this.trackMessageForAds(channel);

        const message = text.trim().toLowerCase();
        if (!message.startsWith('!')) return;

        const args = message.slice(1).split(' ');
        const command = args[0];
        const username = user;
        const channelName = channel;

        if (this.commands[command]) {
            // Pass args without the command itself
            const commandArgs = args.slice(1);
            this.commands[command](channelName, username, commandArgs, msg);
        }
    }

    getOrCreateGame(channel) {
        if (!this.games.has(channel)) {
            this.games.set(channel, new BlackjackGame(channel));
        }
        return this.games.get(channel);
    }

    async sendMessage(channel, message) {
        try {
            await this.chatClient.say(channel, message);
        } catch (error) {
            console.error(`Failed to send message to ${channel}:`, error);
        }
    }

    async handleDeal(channel, username, args, msg) {
        const game = this.getOrCreateGame(channel);
        
        if (game.gameState !== 'waiting') {
            await this.sendMessage(channel, `@${username} A game is already in progress! Use !join to join or wait for it to finish.`);
            return;
        }

        // Add the dealer as first player
        const joinResult = game.addPlayer(username);
        if (!joinResult.success) {
            await this.sendMessage(channel, `@${username} ${joinResult.message}`);
            return;
        }

        await this.sendMessage(channel, `🃏 ${username} started a new blackjack game! Type !join to play (max ${game.maxPlayers} players). Game starts in 30 seconds or when ready.`);

        // Set timeout to auto-start the game
        game.dealTimeout = setTimeout(async () => {
            if (game.gameState === 'waiting' && game.players.size > 0) {
                await this.startGame(channel, game);
            }
        }, game.dealTimeoutMs);
    }

    async handleJoin(channel, username, args, msg) {
        const game = this.getOrCreateGame(channel);
        const result = game.addPlayer(username);
        
        if (result.success) {
            await this.sendMessage(channel, `@${username} ${result.message} (${game.players.size}/${game.maxPlayers} players)`);
            
            // If we have max players, start immediately
            if (game.players.size >= game.maxPlayers) {
                if (game.dealTimeout) {
                    clearTimeout(game.dealTimeout);
                    game.dealTimeout = null;
                }
                await this.startGame(channel, game);
            }
        } else {
            await this.sendMessage(channel, `@${username} ${result.message}`);
        }
    }

    async startGame(channel, game) {
        const dealResult = game.dealInitialCards();
        if (!dealResult.success) {
            await this.sendMessage(channel, dealResult.message);
            return;
        }

        await this.sendMessage(channel, `🎰 ${dealResult.message}`);
        await this.sendMessage(channel, `Dealer shows: ${game.dealerHand.cards[0].toString()} [?]`);
        
        // Show each player's initial hand
        for (const [playerName, player] of game.players) {
            const hand = player.hand;
            let message = `${playerName}: ${hand.toString()} = ${hand.getValue()}`;
            if (hand.isBlackjack()) {
                message += ' - BLACKJACK! 🎉';
                player.status = 'standing';
            }
            await this.sendMessage(channel, message);
        }

        // Check if all players have blackjack or are done
        if (game.allPlayersFinished()) {
            await this.finishGame(channel, game);
        } else {
            // Set timeout for dealer to play automatically
            game.dealerTimeout = setTimeout(async () => {
                if (game.gameState === 'playing') {
                    await this.sendMessage(channel, "⏰ Time's up! Dealer is playing...");
                    await this.finishGame(channel, game);
                }
            }, 60000); // 60 seconds for all players to play
        }
    }

    async handleHit(channel, username, args, msg) {
        const game = this.games.get(channel);
        if (!game) {
            await this.sendMessage(channel, `@${username} No active game. Use !deal to start a new game.`);
            return;
        }

        const result = game.hit(username);
        if (result.success) {
            await this.sendMessage(channel, result.message);
            
            // Check if all players are finished
            if (game.allPlayersFinished()) {
                if (game.dealerTimeout) {
                    clearTimeout(game.dealerTimeout);
                    game.dealerTimeout = null;
                }
                await this.finishGame(channel, game);
            }
        } else {
            await this.sendMessage(channel, `@${username} ${result.message}`);
        }
    }

    async handleStand(channel, username, args, msg) {
        const game = this.games.get(channel);
        if (!game) {
            await this.sendMessage(channel, `@${username} No active game. Use !deal to start a new game.`);
            return;
        }

        const result = game.stand(username);
        if (result.success) {
            await this.sendMessage(channel, result.message);
            
            // Check if all players are finished
            if (game.allPlayersFinished()) {
                if (game.dealerTimeout) {
                    clearTimeout(game.dealerTimeout);
                    game.dealerTimeout = null;
                }
                await this.finishGame(channel, game);
            }
        } else {
            await this.sendMessage(channel, `@${username} ${result.message}`);
        }
    }

    async finishGame(channel, game) {
        // Small delay before dealer plays
        await new Promise(resolve => setTimeout(resolve, game.dealerDelayMs));

        const dealerResult = game.playDealer();
        if (!dealerResult.success) {
            await this.sendMessage(channel, dealerResult.message);
            return;
        }

        const results = game.getResults();
        if (results.success) {
            // Record stats for each player
            if (results.playerResults) {
                for (const playerResult of results.playerResults) {
                    this.statsManager.recordGameResult(channel, playerResult.username, playerResult);
                }
            }

            await this.sendMessage(channel, "🎲 Game Over! Results:");
            for (const result of results.results) {
                await this.sendMessage(channel, result);
            }
        }

        // Reset the game after a short delay
        setTimeout(() => {
            game.reset();
        }, 5000);
    }

    async handleStatus(channel, username, args, msg) {
        const game = this.games.get(channel);
        if (!game) {
            await this.sendMessage(channel, `@${username} No active game. Use !deal to start a new game.`);
            return;
        }

        const status = game.getGameStatus();
        let message = `Game Status: ${status.state}`;
        
        if (status.playerCount > 0) {
            message += ` | Players (${status.playerCount}): ${status.playerList}`;
        }
        
        if (status.canJoin) {
            message += ` | Type !join to play!`;
        }

        await this.sendMessage(channel, `@${username} ${message}`);
    }

    async handleReset(channel, username, args, msg) {
        // Only allow mods/broadcaster to reset
        const userInfo = msg.userInfo;
        if (!userInfo.isMod && !userInfo.isBroadcaster) {
            await this.sendMessage(channel, `@${username} Only moderators can reset the game.`);
            return;
        }

        const game = this.games.get(channel);
        if (game) {
            game.reset();
            await this.sendMessage(channel, `@${username} Game has been reset.`);
        } else {
            await this.sendMessage(channel, `@${username} No active game to reset.`);
        }
    }

    async handleHelp(channel, username, args, msg) {
        const helpMessage = "🃏 Blackjack Commands: !deal (start game), !join (join game), !hit (take card), !stand (keep current hand), !status (game info), !stats [player] (view stats), !mystats (your stats), !leaderboard [category] (top players). Goal: Get as close to 21 as possible without going over!";
        await this.sendMessage(channel, `@${username} ${helpMessage}`);
    }

    async handleStats(channel, username, args, msg) {
        const targetPlayer = args.length > 0 ? args[0].toLowerCase().replace('@', '') : username.toLowerCase();
        const stats = this.statsManager.formatStats(channel, targetPlayer);
        await this.sendMessage(channel, `@${username} ${stats}`);
    }

    async handleMyStats(channel, username, args, msg) {
        const stats = this.statsManager.formatDetailedStats(channel, username.toLowerCase());
        await this.sendMessage(channel, `@${username} ${stats}`);
    }

    async handleLeaderboard(channel, username, args, msg) {
        const category = args.length > 0 ? args[0].toLowerCase() : 'wins';
        const validCategories = ['wins', 'winrate', 'blackjacks', 'games', 'streak'];

        if (!validCategories.includes(category)) {
            await this.sendMessage(channel, `@${username} Valid leaderboard categories: ${validCategories.join(', ')}`);
            return;
        }

        const leaderboard = this.statsManager.getChannelLeaderboard(channel, category, 5);
        await this.sendMessage(channel, `@${username} ${leaderboard}`);
    }

    trackMessageForAds(channel) {
        if (!this.adConfig.enabled) return;

        // Initialize channel ad state if needed
        if (!this.adState.has(channel)) {
            this.adState.set(channel, {
                lastAdTime: 0,
                messagesSinceAd: 0,
                lastAdIndex: -1
            });
        }

        const state = this.adState.get(channel);
        state.messagesSinceAd++;

        // Check if we should send an ad
        const now = Date.now();
        const timeSinceLastAd = now - state.lastAdTime;
        const intervalMs = this.adConfig.intervalMinutes * 60 * 1000;

        if (timeSinceLastAd >= intervalMs &&
            state.messagesSinceAd >= this.adConfig.minMessagesSinceLastAd) {
            this.sendAdvertisement(channel);
        }
    }

    async sendAdvertisement(channel) {
        try {
            const state = this.adState.get(channel);

            // Get next ad message (rotate through them)
            state.lastAdIndex = (state.lastAdIndex + 1) % this.adConfig.messages.length;
            const adMessage = this.adConfig.messages[state.lastAdIndex];

            // Send the ad
            await this.sendMessage(channel, adMessage);

            // Update state
            state.lastAdTime = Date.now();
            state.messagesSinceAd = 0;

            console.log(`📢 Sent advertisement to ${channel}`);
        } catch (error) {
            console.error(`Failed to send advertisement to ${channel}:`, error.message);
        }
    }

    // Configuration methods for ads
    setAdConfig(config) {
        this.adConfig = { ...this.adConfig, ...config };
        console.log('📢 Advertisement config updated:', this.adConfig);
    }

    getAdConfig() {
        return { ...this.adConfig };
    }

    getAdStats() {
        const stats = {};
        for (const [channel, state] of this.adState) {
            stats[channel] = {
                messagesSinceLastAd: state.messagesSinceAd,
                lastAdTime: state.lastAdTime,
                timeSinceLastAd: Date.now() - state.lastAdTime,
                nextAdIn: Math.max(0, (this.adConfig.intervalMinutes * 60 * 1000) - (Date.now() - state.lastAdTime))
            };
        }
        return stats;
    }

    getOrCreateGame(channel) {
        if (!this.games.has(channel)) {
            this.games.set(channel, new BlackjackGame(channel));
        }
        return this.games.get(channel);
    }

    disconnect() {
        if (this.chatClient) {
            this.chatClient.quit();
        }

        // Clear all game timeouts
        for (const game of this.games.values()) {
            if (game.dealTimeout) clearTimeout(game.dealTimeout);
            if (game.dealerTimeout) clearTimeout(game.dealerTimeout);
        }
    }
}

module.exports = TwitchBlackjackBot;
