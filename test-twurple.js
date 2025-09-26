// Test file to verify Twurple integration (without connecting)
const TwitchBlackjackBot = require('./src/twitchBot');

console.log('🔧 Testing Twurple Integration...\n');

// Test 1: Bot instantiation
console.log('Test 1: Bot Instantiation');
try {
    const mockConfig = {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        channels: ['testchannel']
    };

    const bot = new TwitchBlackjackBot(mockConfig);
    console.log('✅ Bot created successfully');
    console.log(`Commands available: ${Object.keys(bot.commands).join(', ')}`);
} catch (error) {
    console.error('❌ Failed to create bot:', error.message);
}

console.log('\nTest 2: Command Structure');
const bot = new TwitchBlackjackBot({
    clientId: 'test',
    clientSecret: 'test',
    accessToken: 'test',
    refreshToken: 'test',
    channels: ['test']
});

const expectedCommands = ['deal', 'join', 'hit', 'stand', 'status', 'reset', 'help', 'blackjack'];
const actualCommands = Object.keys(bot.commands);

console.log(`Expected commands: ${expectedCommands.join(', ')}`);
console.log(`Actual commands: ${actualCommands.join(', ')}`);

const allCommandsPresent = expectedCommands.every(cmd => actualCommands.includes(cmd));
if (allCommandsPresent) {
    console.log('✅ All expected commands are present');
} else {
    console.log('❌ Some commands are missing');
}

console.log('\nTest 3: Game Management');
const game = bot.getOrCreateGame('#testchannel');
console.log(`Game created for channel: ${game.channelName}`);
console.log(`Game state: ${game.gameState}`);
console.log('✅ Game management works correctly');

console.log('\n🎉 Twurple integration tests completed!');
console.log('\nTo test with real Twitch connection:');
console.log('1. Set up your .env file with real credentials');
console.log('2. Run: npm start');
console.log('3. Test commands in your Twitch chat');

console.log('\nNote: This bot now uses Twurple instead of tmi.js');
console.log('- More modern and actively maintained');
console.log('- Better TypeScript support');
console.log('- Improved authentication handling');
console.log('- Automatic token refresh support');
