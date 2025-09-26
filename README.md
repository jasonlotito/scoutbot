# Twitch Blackjack Bot 🃏

A Node.js Twitch chat bot that allows viewers to play blackjack games directly in chat! Players can join games, hit, stand, and compete against the dealer with automatic game management.

**Now powered by Twurple** - the modern, actively maintained Twitch library with better authentication and TypeScript support!

🖥️ **NEW: Desktop App with Dashboard** - Easy-to-use Electron app with real-time monitoring, configuration management, and activity logs!

## Features

- 🎰 **Full Blackjack Gameplay**: Complete blackjack rules with proper card values and dealer logic
- 👥 **Multi-Player Support**: Up to 6 players can join each game
- ⏰ **Automatic Game Management**: Games start automatically and dealer plays after players finish
- 🎯 **Smart Dealer**: Dealer follows standard rules (hits on 16, stands on 17)
- 🏆 **Winner Determination**: Automatic win/lose/push detection with clear results
- 🔄 **Game Reset**: Automatic cleanup and reset for continuous play
- 🛡️ **Mod Controls**: Moderators can reset games if needed
- 📊 **Player Statistics**: Comprehensive stats tracking with win rates, streaks, and leaderboards
- 🏆 **Leaderboards**: Multiple categories including wins, win rate, blackjacks, and more

## Commands

| Command                 | Description                | Who Can Use      |
|-------------------------|----------------------------|------------------|
| `!deal`                 | Start a new blackjack game | Anyone           |
| `!join`                 | Join an existing game      | Anyone           |
| `!hit`                  | Take another card          | Players in game  |
| `!stand`                | Keep current hand          | Players in game  |
| `!status`               | Check current game status  | Anyone           |
| `!reset`                | Reset the current game     | Mods/Broadcaster |
| `!help` or `!blackjack` | Show help message          | Anyone           |

## Statistics Commands

| Command                 | Description                | Usage Example    |
|-------------------------|----------------------------|------------------|
| `!stats [player]`       | View player statistics     | `!stats` or `!stats username` |
| `!mystats`              | View your detailed stats   | `!mystats`       |
| `!leaderboard [category]` | View channel leaderboard | `!leaderboard` or `!leaderboard wins` |
| `!lb [category]`        | Short form of leaderboard  | `!lb winrate`    |

### Leaderboard Categories
- `wins` - Total wins (default)
- `winrate` - Win percentage
- `blackjacks` - Total blackjacks
- `games` - Games played
- `streak` - Longest win streak

### Tracked Statistics
- **Games**: Total games played, wins, losses, pushes
- **Performance**: Win rate, blackjack rate, bust rate
- **Streaks**: Current and longest win/loss streaks
- **Hand Analysis**: Average hand value, highest hand, favorite hand
- **Timeline**: First and last game dates

## 📢 Advertisement System

The bot includes an intelligent advertisement system that promotes the blackjack game automatically:

### Features
- **Smart Timing**: Only sends ads after a configurable interval AND minimum chat activity
- **Rotating Messages**: Multiple ad messages that rotate to keep chat fresh
- **Per-Channel Tracking**: Independent tracking for each channel
- **Slow Chat Protection**: Requires minimum messages before sending ads (prevents spam)
- **Desktop Integration**: Configure through the desktop app settings

### Configuration Options
Add these to your `.env` file:
```env
# Advertisement Settings (optional)
AD_ENABLED=true                 # Enable/disable ads (default: true)
AD_INTERVAL_MINUTES=5          # Minutes between ads (default: 5)
AD_MIN_MESSAGES=10             # Min messages required (default: 10)
```

### How It Works
1. Bot tracks all chat messages per channel
2. After X minutes AND Y messages since last ad, sends an advertisement
3. Rotates through different promotional messages
4. Resets message counter after each ad
5. Respects slow chats by requiring minimum activity level

### Sample Advertisement Messages
- 🃏 Want to play blackjack? Type !deal to start a game!
- 🎲 Ready for some blackjack action? Use !deal to start!
- ♠️ Blackjack time! Start with !deal, join with !join!
- 🎯 Test your luck at blackjack! Commands: !deal, !join, !hit, !stand

## 🚀 Quick Start (Recommended)

### Easy Setup with Authentication Wizard

1. **Download and Install**
   ```bash
   git clone <repository-url>
   cd blackjackbot
   npm install
   ```

2. **Launch the App**
   ```bash
   npm start
   ```

3. **Follow the Setup Wizard**
   - The app will automatically detect missing credentials
   - A step-by-step wizard will guide you through:
     - Creating a Twitch application
     - Getting your Client ID and Secret
     - Authorizing the bot with OAuth
     - Configuring channels

4. **Start Playing!**
   - Your bot will be ready to use immediately
   - All credentials are securely stored
   - Easy recovery if tokens expire

## 📋 Manual Setup (Advanced)

### 1. Prerequisites

- Node.js (version 14 or higher)
- A Twitch account for your bot

### 2. Set Up Twitch Application

1. Go to [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps)
2. Click "Register Your Application"
3. Fill in the details:
   - Name: Your bot name
   - OAuth Redirect URLs: `http://localhost:3000/auth/callback`
   - Category: Chat Bot
4. Copy your **Client ID** and **Client Secret**

### 3. Manual Configuration

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your bot details:
   ```env
   TWITCH_CLIENT_ID=your_client_id_here
   TWITCH_CLIENT_SECRET=your_client_secret_here
   TWITCH_ACCESS_TOKEN=your_access_token_here
   TWITCH_REFRESH_TOKEN=your_refresh_token_here
   CHANNELS=your_channel_name,another_channel
   ```

5. Get tokens from [https://twitchtokengenerator.com/](https://twitchtokengenerator.com/) with scopes: `chat:read` and `chat:edit`

## 🔐 Authentication System

The bot includes a comprehensive authentication wizard that makes setup effortless:

### Features
- **Automatic Detection**: Detects missing or invalid credentials on startup
- **Step-by-Step Guidance**: Walks you through each part of the setup process
- **Secure OAuth Flow**: Uses proper OAuth 2.0 with local callback server
- **Credential Recovery**: Easy to re-authenticate if tokens expire
- **No Manual Token Copying**: Automatically retrieves and stores tokens

### How It Works
1. **App Registration**: Guides you to create a Twitch application
2. **OAuth Authorization**: Opens browser for secure authorization
3. **Token Exchange**: Automatically exchanges auth code for access tokens
4. **Secure Storage**: Saves credentials to `.env` file
5. **Immediate Use**: Bot is ready to use right after setup

### Security Features
- **State Parameter Validation**: Prevents CSRF attacks
- **Local Callback Server**: Runs only during authentication
- **Automatic Cleanup**: Server shuts down after token retrieval
- **Dual Storage System**: Credentials saved to both `.env` file and encrypted OS settings
- **Automatic Recovery**: Restores credentials from OS backup if `.env` is lost

### Storage Locations
- **Primary**: `.env` file in project directory (for compatibility)
- **Backup**: OS-specific encrypted settings storage
  - **macOS**: `~/Library/Preferences/`
  - **Windows**: `%APPDATA%/`
  - **Linux**: `~/.config/`

## Running the Bot

**Desktop App (Recommended):**
```bash
npm start
```
This launches the Electron desktop app with a beautiful dashboard for easy bot management.

**Command Line Mode:**
```bash
npm run test-cli
```
Traditional CLI mode for headless servers or advanced users.

**Development Mode:**
```bash
npm run dev
```
Runs the desktop app with developer tools enabled.

## Desktop Dashboard Features 🖥️

The new Electron desktop app provides a comprehensive dashboard with:

### 📊 **Real-time Monitoring**
- Connection status and uptime tracking
- Active games across all channels
- Command processing statistics
- Player statistics overview
- Live activity logs

### ⚙️ **Easy Configuration**
- Intuitive settings panel
- Secure credential management
- Channel management
- One-click bot start/stop

### 🎮 **Game Management**
- View active games in real-time
- Monitor player counts and game states
- Track game activity across channels

### 📈 **Activity Tracking**
- Comprehensive activity logs
- Export logs for analysis
- Real-time status updates
- Performance monitoring

### 🔧 **Developer Features**
- Built-in developer tools (dev mode)
- Error tracking and debugging
- Configuration validation
- Automatic updates (coming soon)

## How to Play

### Starting a Game
1. Any viewer types `!deal` to start a new game
2. Other viewers can type `!join` to join (up to 6 players total)
3. Game automatically starts after 30 seconds or when 6 players join

### Playing Your Hand
- Type `!hit` to take another card
- Type `!stand` to keep your current hand
- If you go over 21, you automatically bust
- If you get exactly 21 with your first 2 cards, that's blackjack!

### Dealer Turn
- After all players finish (or 60 seconds pass), the dealer plays automatically
- Dealer hits on 16 and stands on 17
- Results are announced automatically

### Winning
- **Win**: Your hand beats the dealer's hand without busting
- **Lose**: You bust or dealer's hand beats yours
- **Push**: You and dealer have the same value (tie)

## Game Rules

- **Card Values**: 
  - Number cards (2-10): Face value
  - Face cards (J, Q, K): 10 points
  - Aces: 11 points (automatically becomes 1 if needed to avoid busting)
- **Blackjack**: 21 with exactly 2 cards
- **Bust**: Hand value over 21 (automatic loss)
- **Dealer Rules**: Hits on 16, stands on 17

## Configuration

The bot can be customized by modifying the game settings in `src/blackjack.js`:

- `maxPlayers`: Maximum players per game (default: 6)
- `dealTimeoutMs`: Time to wait before auto-starting (default: 30 seconds)
- `dealerDelayMs`: Delay before dealer plays (default: 5 seconds)

## Troubleshooting

### Bot Won't Connect
- Check your Client ID and Client Secret are correct
- Verify your Access Token has the required scopes (`chat:read`, `chat:edit`)
- Make sure channel names don't include the `#` symbol
- Ensure your Twitch application is properly configured

### Commands Not Working
- Ensure commands start with `!` (exclamation mark)
- Check that the bot has joined the channel
- Verify the bot account isn't banned or timed out

### Game Issues
- Use `!reset` (mods only) to reset a stuck game
- Check console logs for error messages
- Restart the bot if needed

## Development

### Project Structure
```
blackjackbot/
├── src/
│   ├── blackjack.js    # Core game logic
│   └── twitchBot.js    # Twitch integration
├── index.js            # Main entry point
├── package.json        # Dependencies and scripts
├── .env.example        # Environment template
└── README.md          # This file
```

### Adding Features
- Game logic is in `src/blackjack.js`
- Twitch commands are handled in `src/twitchBot.js`
- Add new commands by extending the `commands` object

## License

ISC License - feel free to modify and use for your own channels!

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Make sure all environment variables are set correctly

## Migration from tmi.js

This bot has been updated to use **Twurple** instead of the deprecated `tmi.js`. Key improvements:

- ✅ **Modern & Maintained**: Actively developed with regular updates
- ✅ **Better Authentication**: Built-in token refresh and proper OAuth handling
- ✅ **TypeScript Support**: Full type definitions for better development experience
- ✅ **Improved API**: More intuitive and consistent API design
- ✅ **Better Error Handling**: More detailed error messages and recovery

### What Changed:
- Authentication now requires Client ID, Client Secret, and Access Token (instead of just OAuth token)
- More secure token management with automatic refresh capability
- Improved message handling and user information access

## Building for Distribution 📦

You can build the desktop app for different platforms:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

Built applications will be available in the `dist/` directory.

### System Requirements
- **Windows**: Windows 10 or later
- **macOS**: macOS 10.14 or later
- **Linux**: Most modern distributions

Happy gaming! 🎰
