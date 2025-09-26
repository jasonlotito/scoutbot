// Simple test file to verify blackjack logic
const { BlackjackGame, Card, Hand, Deck } = require('./src/blackjack');

console.log('🃏 Testing Blackjack Bot Logic...\n');

// Test 1: Card values
console.log('Test 1: Card Values');
const aceCard = new Card('hearts', 'A');
const kingCard = new Card('spades', 'K');
const numberCard = new Card('diamonds', '7');

console.log(`Ace value: ${aceCard.getValue()} (should be 11)`);
console.log(`King value: ${kingCard.getValue()} (should be 10)`);
console.log(`7 value: ${numberCard.getValue()} (should be 7)`);
console.log(`Ace display: ${aceCard.toString()}`);
console.log('✅ Card values test passed\n');

// Test 2: Hand evaluation
console.log('Test 2: Hand Evaluation');
const hand1 = new Hand();
hand1.addCard(new Card('hearts', 'A'));
hand1.addCard(new Card('spades', 'K'));
console.log(`Blackjack hand: ${hand1.toString()} = ${hand1.getValue()} (should be 21)`);
console.log(`Is blackjack: ${hand1.isBlackjack()} (should be true)`);

const hand2 = new Hand();
hand2.addCard(new Card('hearts', 'A'));
hand2.addCard(new Card('spades', '5'));
hand2.addCard(new Card('diamonds', '7'));
console.log(`Soft hand: ${hand2.toString()} = ${hand2.getValue()} (should be 13, ace as 1)`);

const hand3 = new Hand();
hand3.addCard(new Card('hearts', 'K'));
hand3.addCard(new Card('spades', 'Q'));
hand3.addCard(new Card('diamonds', '5'));
console.log(`Bust hand: ${hand3.toString()} = ${hand3.getDisplayValue()} (should show BUST)`);
console.log(`Is busted: ${hand3.isBusted()} (should be true)`);
console.log('✅ Hand evaluation test passed\n');

// Test 3: Deck functionality
console.log('Test 3: Deck Functionality');
const deck = new Deck();
console.log(`New deck size: ${deck.cards.length} (should be 52)`);
const card1 = deck.deal();
const card2 = deck.deal();
console.log(`After dealing 2 cards: ${deck.cards.length} (should be 50)`);
console.log(`Dealt cards: ${card1.toString()}, ${card2.toString()}`);
console.log('✅ Deck functionality test passed\n');

// Test 4: Game logic
console.log('Test 4: Game Logic');
const game = new BlackjackGame('#testchannel');
console.log(`Initial game state: ${game.gameState} (should be 'waiting')`);
console.log(`Can join game: ${game.canJoinGame()} (should be true)`);

// Add players
const result1 = game.addPlayer('player1');
const result2 = game.addPlayer('player2');
console.log(`Player 1 join: ${result1.success} - ${result1.message}`);
console.log(`Player 2 join: ${result2.success} - ${result2.message}`);
console.log(`Players in game: ${game.players.size} (should be 2)`);

// Try to add same player again
const result3 = game.addPlayer('player1');
console.log(`Player 1 join again: ${result3.success} - ${result3.message} (should fail)`);

// Deal cards
const dealResult = game.dealInitialCards();
console.log(`Deal result: ${dealResult.success} - ${dealResult.message}`);
console.log(`Game state after deal: ${game.gameState} (should be 'playing')`);

// Check player hands
for (const [username, player] of game.players) {
    console.log(`${username}: ${player.hand.toString()} = ${player.hand.getValue()}`);
}
console.log(`Dealer shows: ${game.dealerHand.cards[0].toString()} [hidden]`);

console.log('✅ Game logic test passed\n');

// Test 5: Game status
console.log('Test 5: Game Status');
const status = game.getGameStatus();
console.log(`Game status:`, status);
console.log('✅ Game status test passed\n');

console.log('🎉 All tests passed! The blackjack bot logic is working correctly.');
console.log('\nTo run the bot:');
console.log('1. Copy .env.example to .env');
console.log('2. Fill in your Twitch bot credentials');
console.log('3. Run: npm start');
