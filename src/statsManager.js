const fs = require('fs');
const path = require('path');

class StatsManager {
    constructor() {
        this.statsFile = path.join(__dirname, '..', 'data', 'player-stats.json');
        this.stats = new Map(); // channel -> player -> stats
        this.loadStats();
        
        // Ensure data directory exists
        const dataDir = path.dirname(this.statsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }

    loadStats() {
        try {
            if (fs.existsSync(this.statsFile)) {
                const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf8'));
                
                // Convert plain object back to nested Maps
                for (const [channel, players] of Object.entries(data)) {
                    const playerMap = new Map();
                    for (const [player, stats] of Object.entries(players)) {
                        playerMap.set(player, stats);
                    }
                    this.stats.set(channel, playerMap);
                }
                console.log(`📊 Loaded stats ${JSON.stringify(this.stats)}`);
                
                console.log(`📊 Loaded stats for ${this.stats.size} channels`);
            }
        } catch (error) {
            console.error('Failed to load stats:', error.message);
            this.stats = new Map();
        }
    }

    saveStats() {
        try {
            // Convert nested Maps to plain object for JSON serialization
            const data = {};
            for (const [channel, players] of this.stats) {
                data[channel] = {};
                for (const [player, stats] of players) {
                    data[channel][player] = stats;
                }
            }
            
            fs.writeFileSync(this.statsFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save stats:', error.message);
        }
    }

    getPlayerStats(channel, player) {
        if (!this.stats.has(channel)) {
            this.stats.set(channel, new Map());
        }
        
        const channelStats = this.stats.get(channel);
        if (!channelStats.has(player)) {
            channelStats.set(player, this.createEmptyStats());
        }
        
        return channelStats.get(player);
    }

    createEmptyStats() {
        return {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            pushes: 0,
            blackjacks: 0,
            busts: 0,
            surrenders: 0,
            totalHandValue: 0,
            highestHand: 0,
            currentWinStreak: 0,
            longestWinStreak: 0,
            currentLossStreak: 0,
            longestLossStreak: 0,
            averageHandValue: 0,
            winRate: 0,
            blackjackRate: 0,
            bustRate: 0,
            firstGameDate: null,
            lastGameDate: null,
            favoriteHand: null, // Most common final hand value
            handDistribution: {} // Track frequency of final hand values
        };
    }

    recordGameResult(channel, player, result) {
        const stats = this.getPlayerStats(channel, player);
        const now = new Date().toISOString();
        
        // Update basic counters
        stats.gamesPlayed++;
        stats.lastGameDate = now;
        if (!stats.firstGameDate) {
            stats.firstGameDate = now;
        }

        // Record hand value
        if (result.handValue && result.handValue <= 21) {
            stats.totalHandValue += result.handValue;
            stats.highestHand = Math.max(stats.highestHand, result.handValue);
            
            // Track hand distribution
            const handKey = result.handValue.toString();
            stats.handDistribution[handKey] = (stats.handDistribution[handKey] || 0) + 1;
            
            // Update favorite hand (most common)
            let maxCount = 0;
            let favoriteHand = null;
            for (const [hand, count] of Object.entries(stats.handDistribution)) {
                if (count > maxCount) {
                    maxCount = count;
                    favoriteHand = parseInt(hand);
                }
            }
            stats.favoriteHand = favoriteHand;
        }

        // Record specific outcomes
        switch (result.outcome) {
            case 'win':
                stats.wins++;
                stats.currentWinStreak++;
                stats.currentLossStreak = 0;
                stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentWinStreak);
                break;
                
            case 'loss':
                stats.losses++;
                stats.currentLossStreak++;
                stats.currentWinStreak = 0;
                stats.longestLossStreak = Math.max(stats.longestLossStreak, stats.currentLossStreak);
                break;
                
            case 'push':
                stats.pushes++;
                // Pushes don't break streaks
                break;
        }

        // Record special events
        if (result.isBlackjack) {
            stats.blackjacks++;
        }
        
        if (result.isBust) {
            stats.busts++;
        }
        
        if (result.isSurrender) {
            stats.surrenders++;
        }

        // Calculate derived stats
        this.updateDerivedStats(stats);
        
        // Save to disk
        this.saveStats();
    }

    updateDerivedStats(stats) {
        // Win rate
        const totalDecisiveGames = stats.wins + stats.losses;
        stats.winRate = totalDecisiveGames > 0 ? (stats.wins / totalDecisiveGames * 100) : 0;
        
        // Average hand value
        stats.averageHandValue = stats.gamesPlayed > 0 ? (stats.totalHandValue / stats.gamesPlayed) : 0;
        
        // Blackjack rate
        stats.blackjackRate = stats.gamesPlayed > 0 ? (stats.blackjacks / stats.gamesPlayed * 100) : 0;
        
        // Bust rate
        stats.bustRate = stats.gamesPlayed > 0 ? (stats.busts / stats.gamesPlayed * 100) : 0;
    }

    formatStats(channel, player) {
        const stats = this.getPlayerStats(channel, player);
        
        if (stats.gamesPlayed === 0) {
            return `${player}: No games played yet! Type !deal to start your first game.`;
        }

        const winRate = stats.winRate.toFixed(1);
        const avgHand = stats.averageHandValue.toFixed(1);
        const blackjackRate = stats.blackjackRate.toFixed(1);
        const bustRate = stats.bustRate.toFixed(1);
        
        let streakInfo = '';
        if (stats.currentWinStreak > 0) {
            streakInfo = ` 🔥 ${stats.currentWinStreak} win streak!`;
        } else if (stats.currentLossStreak > 0) {
            streakInfo = ` 💀 ${stats.currentLossStreak} loss streak`;
        }

        return `${player}'s Stats: ${stats.gamesPlayed} games | ${stats.wins}W-${stats.losses}L-${stats.pushes}P (${winRate}% win rate) | ${stats.blackjacks} blackjacks (${blackjackRate}%) | ${stats.busts} busts (${bustRate}%) | Avg hand: ${avgHand} | Best streak: ${stats.longestWinStreak}${streakInfo}`;
    }

    formatDetailedStats(channel, player) {
        const stats = this.getPlayerStats(channel, player);
        
        if (stats.gamesPlayed === 0) {
            return `${player}: No games played yet! Type !deal to start your first game.`;
        }

        const lines = [];
        lines.push(`📊 ${player}'s Detailed Stats:`);
        lines.push(`Games: ${stats.gamesPlayed} | Record: ${stats.wins}W-${stats.losses}L-${stats.pushes}P`);
        lines.push(`Win Rate: ${stats.winRate.toFixed(1)}% | Blackjacks: ${stats.blackjacks} (${stats.blackjackRate.toFixed(1)}%)`);
        lines.push(`Busts: ${stats.busts} (${stats.bustRate.toFixed(1)}%) | Avg Hand: ${stats.averageHandValue.toFixed(1)}`);
        lines.push(`Best Hand: ${stats.highestHand} | Favorite Hand: ${stats.favoriteHand || 'N/A'}`);
        lines.push(`Win Streak: ${stats.currentWinStreak} (Best: ${stats.longestWinStreak})`);
        
        if (stats.firstGameDate) {
            const firstGame = new Date(stats.firstGameDate).toLocaleDateString();
            lines.push(`Playing since: ${firstGame}`);
        }

        return lines.join(' | ');
    }

    getChannelLeaderboard(channel, category = 'wins', limit = 5) {
        if (!this.stats.has(channel)) {
            return 'No stats available for this channel yet.';
        }

        const channelStats = this.stats.get(channel);
        const players = Array.from(channelStats.entries())
            .filter(([player, stats]) => stats.gamesPlayed > 0)
            .sort((a, b) => {
                switch (category) {
                    case 'wins': return b[1].wins - a[1].wins;
                    case 'winrate': return b[1].winRate - a[1].winRate;
                    case 'blackjacks': return b[1].blackjacks - a[1].blackjacks;
                    case 'games': return b[1].gamesPlayed - a[1].gamesPlayed;
                    case 'streak': return b[1].longestWinStreak - a[1].longestWinStreak;
                    default: return b[1].wins - a[1].wins;
                }
            })
            .slice(0, limit);

        if (players.length === 0) {
            return 'No players with recorded games yet.';
        }

        const categoryName = {
            'wins': 'Wins',
            'winrate': 'Win Rate',
            'blackjacks': 'Blackjacks',
            'games': 'Games Played',
            'streak': 'Best Win Streak'
        }[category] || 'Wins';

        const leaderboard = players.map(([player, stats], index) => {
            let value;
            if (category === 'winrate') {
                value = `${stats.winRate.toFixed(1)}%`;
            } else if (category === 'streak') {
                value = stats.longestWinStreak;
            } else if (category === 'games') {
                value = stats.gamesPlayed;
            } else {
                value = stats[category];
            }
            return `${index + 1}. ${player}: ${value}`;
        }).join(' | ');

        return `🏆 ${categoryName} Leaderboard: ${leaderboard}`;
    }

    getTotalStats() {
        let totalGames = 0;
        let totalPlayers = 0;
        let totalChannels = this.stats.size;

        for (const [channel, players] of this.stats) {
            totalPlayers += players.size;
            for (const [player, stats] of players) {
                totalGames += stats.gamesPlayed;
            }
        }

        return {
            totalChannels,
            totalPlayers,
            totalGames
        };
    }
}

module.exports = StatsManager;
