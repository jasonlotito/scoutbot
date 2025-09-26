// Test stats system
const StatsManager = require('./src/statsManager');
const fs = require('fs');
const path = require('path');

console.log('📊 Testing Stats System...\n');

// Clean up any existing test data
const testStatsFile = path.join(__dirname, 'data', 'player-stats.json');
if (fs.existsSync(testStatsFile)) {
    fs.unlinkSync(testStatsFile);
}

// Test 1: Stats Manager Initialization
console.log('Test 1: Stats Manager Initialization');
const statsManager = new StatsManager();

console.log('✅ StatsManager created successfully');
console.log(`Stats file path: ${statsManager.statsFile}`);

// Test 2: Recording Game Results
console.log('\nTest 2: Recording Game Results');

// Simulate some game results
const testResults = [
    { username: 'player1', handValue: 20, outcome: 'win', isBlackjack: false, isBust: false },
    { username: 'player2', handValue: 22, outcome: 'loss', isBlackjack: false, isBust: true },
    { username: 'player1', handValue: 21, outcome: 'win', isBlackjack: true, isBust: false },
    { username: 'player3', handValue: 18, outcome: 'loss', isBlackjack: false, isBust: false },
    { username: 'player1', handValue: 19, outcome: 'push', isBlackjack: false, isBust: false },
    { username: 'player2', handValue: 20, outcome: 'win', isBlackjack: false, isBust: false },
    { username: 'player1', handValue: 17, outcome: 'loss', isBlackjack: false, isBust: false },
];

const channel = '#testchannel';
for (const result of testResults) {
    statsManager.recordGameResult(channel, result.username, result);
}

console.log('✅ Recorded 7 test game results');

// Test 3: Player Stats Retrieval
console.log('\nTest 3: Player Stats Retrieval');

const player1Stats = statsManager.getPlayerStats(channel, 'player1');
console.log(`Player1 games played: ${player1Stats.gamesPlayed} (should be 4)`);
console.log(`Player1 wins: ${player1Stats.wins} (should be 2)`);
console.log(`Player1 losses: ${player1Stats.losses} (should be 1)`);
console.log(`Player1 pushes: ${player1Stats.pushes} (should be 1)`);
console.log(`Player1 blackjacks: ${player1Stats.blackjacks} (should be 1)`);
console.log(`Player1 win rate: ${player1Stats.winRate.toFixed(1)}% (should be 66.7%)`);

const player2Stats = statsManager.getPlayerStats(channel, 'player2');
console.log(`Player2 busts: ${player2Stats.busts} (should be 1)`);
console.log(`Player2 bust rate: ${player2Stats.bustRate.toFixed(1)}% (should be 50.0%)`);

if (player1Stats.gamesPlayed === 4 && player1Stats.wins === 2 && player1Stats.blackjacks === 1) {
    console.log('✅ Player stats retrieval test passed');
} else {
    console.log('❌ Player stats retrieval test failed');
}

// Test 4: Stats Formatting
console.log('\nTest 4: Stats Formatting');

const formattedStats = statsManager.formatStats(channel, 'player1');
console.log(`Formatted stats: ${formattedStats}`);

const detailedStats = statsManager.formatDetailedStats(channel, 'player1');
console.log(`Detailed stats: ${detailedStats}`);

if (formattedStats.includes('player1') && formattedStats.includes('4 games')) {
    console.log('✅ Stats formatting test passed');
} else {
    console.log('❌ Stats formatting test failed');
}

// Test 5: Leaderboard
console.log('\nTest 5: Leaderboard');

const winsLeaderboard = statsManager.getChannelLeaderboard(channel, 'wins', 3);
console.log(`Wins leaderboard: ${winsLeaderboard}`);

const winrateLeaderboard = statsManager.getChannelLeaderboard(channel, 'winrate', 3);
console.log(`Win rate leaderboard: ${winrateLeaderboard}`);

const blackjacksLeaderboard = statsManager.getChannelLeaderboard(channel, 'blackjacks', 3);
console.log(`Blackjacks leaderboard: ${blackjacksLeaderboard}`);

if (winsLeaderboard.includes('player1') && winsLeaderboard.includes('2')) {
    console.log('✅ Leaderboard test passed');
} else {
    console.log('❌ Leaderboard test failed');
}

// Test 6: Win Streaks
console.log('\nTest 6: Win Streaks');

// Add more wins for player1 to test streaks
const streakResults = [
    { username: 'player1', handValue: 20, outcome: 'win', isBlackjack: false, isBust: false },
    { username: 'player1', handValue: 19, outcome: 'win', isBlackjack: false, isBust: false },
    { username: 'player1', handValue: 21, outcome: 'win', isBlackjack: true, isBust: false },
];

for (const result of streakResults) {
    statsManager.recordGameResult(channel, result.username, result);
}

const updatedPlayer1Stats = statsManager.getPlayerStats(channel, 'player1');
console.log(`Player1 current win streak: ${updatedPlayer1Stats.currentWinStreak} (should be 3)`);
console.log(`Player1 longest win streak: ${updatedPlayer1Stats.longestWinStreak} (should be 3)`);

if (updatedPlayer1Stats.currentWinStreak === 3 && updatedPlayer1Stats.longestWinStreak === 3) {
    console.log('✅ Win streaks test passed');
} else {
    console.log('❌ Win streaks test failed');
}

// Test 7: Data Persistence
console.log('\nTest 7: Data Persistence');

// Create a new stats manager to test loading
const statsManager2 = new StatsManager();
const loadedStats = statsManager2.getPlayerStats(channel, 'player1');

console.log(`Loaded player1 games: ${loadedStats.gamesPlayed} (should be 7)`);
console.log(`Loaded player1 wins: ${loadedStats.wins} (should be 5)`);

if (loadedStats.gamesPlayed === 7 && loadedStats.wins === 5) {
    console.log('✅ Data persistence test passed');
} else {
    console.log('❌ Data persistence test failed');
}

// Test 8: Total Stats
console.log('\nTest 8: Total Stats');

const totalStats = statsManager.getTotalStats();
console.log(`Total channels: ${totalStats.totalChannels} (should be 1)`);
console.log(`Total players: ${totalStats.totalPlayers} (should be 3)`);
console.log(`Total games: ${totalStats.totalGames} (should be 10)`);

if (totalStats.totalChannels === 1 && totalStats.totalPlayers === 3 && totalStats.totalGames === 10) {
    console.log('✅ Total stats test passed');
} else {
    console.log('❌ Total stats test failed');
}

// Test 9: Edge Cases
console.log('\nTest 9: Edge Cases');

// Test new player with no games
const newPlayerStats = statsManager.formatStats(channel, 'newplayer');
console.log(`New player stats: ${newPlayerStats}`);

// Test empty channel leaderboard
const emptyLeaderboard = statsManager.getChannelLeaderboard('#emptychannel', 'wins', 5);
console.log(`Empty channel leaderboard: ${emptyLeaderboard}`);

if (newPlayerStats.includes('No games played') && emptyLeaderboard.includes('No stats available')) {
    console.log('✅ Edge cases test passed');
} else {
    console.log('❌ Edge cases test failed');
}

console.log('\n🎉 Stats system tests completed!');

console.log('\n📊 Stats System Features:');
console.log('- Per-channel player statistics');
console.log('- Comprehensive game outcome tracking');
console.log('- Win/loss streaks and records');
console.log('- Blackjack and bust rate tracking');
console.log('- Average hand value calculation');
console.log('- Hand distribution analysis');
console.log('- Leaderboards with multiple categories');
console.log('- Persistent data storage');
console.log('- Detailed and summary stat formats');

console.log('\n🎮 Available Commands:');
console.log('- !stats [player] - View player statistics');
console.log('- !mystats - View your detailed statistics');
console.log('- !leaderboard [category] - View channel leaderboard');
console.log('- !lb [category] - Short form of leaderboard');

console.log('\n📈 Tracked Statistics:');
console.log('- Games played, wins, losses, pushes');
console.log('- Blackjacks, busts, surrenders');
console.log('- Win rate, blackjack rate, bust rate');
console.log('- Current and longest win/loss streaks');
console.log('- Average and highest hand values');
console.log('- Most common final hand value');
console.log('- First and last game dates');

console.log('\n🏆 Leaderboard Categories:');
console.log('- wins - Total wins');
console.log('- winrate - Win percentage');
console.log('- blackjacks - Total blackjacks');
console.log('- games - Games played');
console.log('- streak - Longest win streak');

// Clean up test data
if (fs.existsSync(testStatsFile)) {
    fs.unlinkSync(testStatsFile);
    console.log('\n🧹 Test data cleaned up');
}
