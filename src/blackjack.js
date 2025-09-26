class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }

    getValue() {
        if (this.rank === 'A') return 11;
        if (['K', 'Q', 'J'].includes(this.rank)) return 10;
        return parseInt(this.rank);
    }

    toString() {
        const suitSymbols = { 'hearts': '♥️', 'diamonds': '♦️', 'clubs': '♣️', 'spades': '♠️' };
        return `${this.rank}${suitSymbols[this.suit]}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    reset() {
        this.cards = [];
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        for (const suit of suits) {
            for (const rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        if (this.cards.length === 0) {
            this.reset();
        }
        return this.cards.pop();
    }
}

class Hand {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    getValue() {
        let value = 0;
        let aces = 0;

        for (const card of this.cards) {
            if (card.rank === 'A') {
                aces++;
                value += 11;
            } else {
                value += card.getValue();
            }
        }

        // Adjust for aces
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }

        return value;
    }

    isBusted() {
        return this.getValue() > 21;
    }

    isBlackjack() {
        return this.cards.length === 2 && this.getValue() === 21;
    }

    toString() {
        return this.cards.map(card => card.toString()).join(' ');
    }

    getDisplayValue() {
        const value = this.getValue();
        return this.isBusted() ? `${value} (BUST)` : value.toString();
    }
}

class BlackjackGame {
    constructor(channelName) {
        this.channelName = channelName;
        this.deck = new Deck();
        this.players = new Map(); // username -> { hand, status }
        this.dealerHand = new Hand();
        this.gameState = 'waiting'; // waiting, dealing, playing, dealer_turn, finished
        this.dealTimeout = null;
        this.dealerTimeout = null;
        this.maxPlayers = 6;
        this.dealTimeoutMs = 30000; // 30 seconds to join
        this.dealerDelayMs = 5000; // 5 seconds before dealer plays
    }

    canJoinGame() {
        return this.gameState === 'waiting' && this.players.size < this.maxPlayers;
    }

    addPlayer(username) {
        if (!this.canJoinGame()) {
            return { success: false, message: "Cannot join game right now." };
        }

        if (this.players.has(username)) {
            return { success: false, message: "You're already in the game!" };
        }

        this.players.set(username, {
            hand: new Hand(),
            status: 'playing' // playing, standing, busted
        });

        return { success: true, message: `${username} joined the game!` };
    }

    dealInitialCards() {
        if (this.gameState !== 'waiting' || this.players.size === 0) {
            return { success: false, message: "No players to deal to." };
        }

        this.gameState = 'dealing';
        
        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            for (const [username, player] of this.players) {
                player.hand.addCard(this.deck.deal());
            }
            // Deal to dealer
            this.dealerHand.addCard(this.deck.deal());
        }

        this.gameState = 'playing';
        return { success: true, message: "Cards dealt! Players can now !hit or !stand" };
    }

    hit(username) {
        if (this.gameState !== 'playing') {
            return { success: false, message: "No active game." };
        }

        const player = this.players.get(username);
        if (!player) {
            return { success: false, message: "You're not in this game." };
        }

        if (player.status !== 'playing') {
            return { success: false, message: "You've already finished your turn." };
        }

        player.hand.addCard(this.deck.deal());
        
        if (player.hand.isBusted()) {
            player.status = 'busted';
            return {
                success: true,
                message: `${username}: ${player.hand.toString()} = ${player.hand.getDisplayValue()}`
            };
        }

        return {
            success: true,
            message: `${username}: ${player.hand.toString()} = ${player.hand.getValue()}`
        };
    }

    stand(username) {
        if (this.gameState !== 'playing') {
            return { success: false, message: "No active game." };
        }

        const player = this.players.get(username);
        if (!player) {
            return { success: false, message: "You're not in this game." };
        }

        if (player.status !== 'playing') {
            return { success: false, message: "You've already finished your turn." };
        }

        player.status = 'standing';
        return {
            success: true,
            message: `${username} stands with ${player.hand.toString()} = ${player.hand.getValue()}`
        };
    }

    allPlayersFinished() {
        for (const [username, player] of this.players) {
            if (player.status === 'playing') {
                return false;
            }
        }
        return true;
    }

    playDealer() {
        if (this.gameState !== 'playing') {
            return { success: false, message: "Cannot play dealer now." };
        }

        this.gameState = 'dealer_turn';
        
        // Dealer hits on 16 and stands on 17
        while (this.dealerHand.getValue() < 17) {
            this.dealerHand.addCard(this.deck.deal());
        }

        this.gameState = 'finished';
        return { success: true };
    }

    getResults() {
        if (this.gameState !== 'finished') {
            return { success: false, message: "Game not finished yet." };
        }

        const dealerValue = this.dealerHand.getValue();
        const dealerBusted = this.dealerHand.isBusted();
        const results = [];
        const playerResults = [];

        results.push(`Dealer: ${this.dealerHand.toString()} = ${this.dealerHand.getDisplayValue()}`);

        for (const [username, player] of this.players) {
            const playerValue = player.hand.getValue();
            const isBlackjack = player.hand.isBlackjack();
            const isBust = player.status === 'busted';
            let outcome = '';
            let displayResult = '';

            if (isBust) {
                outcome = 'loss';
                displayResult = 'LOSE (Bust)';
            } else if (dealerBusted) {
                outcome = 'win';
                displayResult = 'WIN';
            } else if (playerValue > dealerValue) {
                outcome = 'win';
                displayResult = 'WIN';
            } else if (playerValue === dealerValue) {
                outcome = 'push';
                displayResult = 'PUSH';
            } else {
                outcome = 'loss';
                displayResult = 'LOSE';
            }

            results.push(`${username}: ${player.hand.toString()} = ${playerValue} - ${displayResult}`);

            // Store detailed result for stats tracking
            playerResults.push({
                username,
                handValue: playerValue,
                outcome,
                isBlackjack,
                isBust,
                isSurrender: false, // We don't have surrender yet, but ready for future
                hand: player.hand.toString()
            });
        }

        return { success: true, results, playerResults };
    }

    reset() {
        this.players.clear();
        this.dealerHand = new Hand();
        this.gameState = 'waiting';
        if (this.dealTimeout) {
            clearTimeout(this.dealTimeout);
            this.dealTimeout = null;
        }
        if (this.dealerTimeout) {
            clearTimeout(this.dealerTimeout);
            this.dealerTimeout = null;
        }
    }

    getGameStatus() {
        const playerCount = this.players.size;
        const playerList = Array.from(this.players.keys()).join(', ');
        
        return {
            state: this.gameState,
            playerCount,
            playerList,
            canJoin: this.canJoinGame()
        };
    }
}

module.exports = { BlackjackGame, Card, Deck, Hand };
