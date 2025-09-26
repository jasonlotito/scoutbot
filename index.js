require('dotenv').config();
const TwitchBlackjackBot = require('./src/twitchBot');

// CLI mode - for backwards compatibility
console.log('🃏 Twitch Blackjack Bot - CLI Mode');
console.log('For the full dashboard experience, run: npm start');

// Configuration
const config = {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    accessToken: process.env.TWITCH_ACCESS_TOKEN,
    refreshToken: process.env.TWITCH_REFRESH_TOKEN,
    channels: (process.env.CHANNELS || 'your_channel').split(',').map(ch => ch.trim())
};

// Validate configuration
if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET ||
    !process.env.TWITCH_ACCESS_TOKEN || !process.env.CHANNELS) {
    console.error('Missing required environment variables. Please check your .env file.');
    console.error('Required: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_ACCESS_TOKEN, CHANNELS');
    console.error('Optional: TWITCH_REFRESH_TOKEN (recommended for automatic token refresh)');
    process.exit(1);
}

console.log('Starting Twitch Blackjack Bot...');
console.log(`Client ID: ${config.clientId}`);
console.log(`Channels: ${config.channels.join(', ')}`);

const bot = new TwitchBlackjackBot(config);

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down bot...');
    bot.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down bot...');
    bot.disconnect();
    process.exit(0);
});

// Start the bot
bot.connect().catch(error => {
    console.error('Failed to start bot:', error);
    process.exit(1);
});
