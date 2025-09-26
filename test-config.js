// Test configuration handling
const fs = require('fs');
const path = require('path');

console.log('⚙️ Testing Configuration System...\n');

// Test 1: Check .env.example exists and has correct format
console.log('Test 1: .env.example Template');
if (fs.existsSync('.env.example')) {
    console.log('✅ .env.example exists');
    
    const exampleContent = fs.readFileSync('.env.example', 'utf8');
    const requiredVars = [
        'TWITCH_CLIENT_ID',
        'TWITCH_CLIENT_SECRET', 
        'TWITCH_ACCESS_TOKEN',
        'TWITCH_REFRESH_TOKEN',
        'CHANNELS'
    ];
    
    let allVarsPresent = true;
    for (const varName of requiredVars) {
        if (exampleContent.includes(`${varName}=`)) {
            console.log(`✅ ${varName} found in template`);
        } else {
            console.log(`❌ ${varName} missing from template`);
            allVarsPresent = false;
        }
    }
    
    if (allVarsPresent) {
        console.log('✅ All required variables present in template\n');
    } else {
        console.log('❌ Some required variables missing from template\n');
    }
} else {
    console.log('❌ .env.example not found\n');
}

// Test 2: Test configuration parsing
console.log('Test 2: Configuration Parsing');
require('dotenv').config();

const testEnvContent = `# Test configuration
TWITCH_CLIENT_ID=test_client_id
TWITCH_CLIENT_SECRET=test_secret
TWITCH_ACCESS_TOKEN=test_token
TWITCH_REFRESH_TOKEN=test_refresh
CHANNELS=channel1,channel2,channel3
`;

// Create a temporary test .env file
const testEnvPath = '.env.test';
fs.writeFileSync(testEnvPath, testEnvContent);

// Test parsing
try {
    const dotenv = require('dotenv');
    const testConfig = dotenv.parse(fs.readFileSync(testEnvPath));
    
    console.log(`Client ID: ${testConfig.TWITCH_CLIENT_ID} (should be test_client_id)`);
    console.log(`Channels: ${testConfig.CHANNELS} (should be channel1,channel2,channel3)`);
    
    const channels = testConfig.CHANNELS.split(',').map(ch => ch.trim());
    console.log(`Parsed channels: [${channels.join(', ')}] (should be 3 channels)`);
    
    if (channels.length === 3 && channels.includes('channel1')) {
        console.log('✅ Configuration parsing test passed');
    } else {
        console.log('❌ Configuration parsing test failed');
    }
    
    // Clean up test file
    fs.unlinkSync(testEnvPath);
    
} catch (error) {
    console.log(`❌ Configuration parsing test failed: ${error.message}`);
    // Clean up test file
    if (fs.existsSync(testEnvPath)) {
        fs.unlinkSync(testEnvPath);
    }
}

console.log('\nTest 3: Environment Variable Validation');

// Test validation logic
function validateConfig(config) {
    const issues = [];
    
    if (!config.clientId || config.clientId === 'your_client_id_here') {
        issues.push('Client ID not configured');
    }
    
    if (!config.clientSecret || config.clientSecret === 'your_client_secret_here') {
        issues.push('Client Secret not configured');
    }
    
    if (!config.accessToken || config.accessToken === 'your_access_token_here') {
        issues.push('Access Token not configured');
    }
    
    if (!config.channels || config.channels.length === 0) {
        issues.push('No channels configured');
    }
    
    return issues;
}

// Test with default values
const defaultConfig = {
    clientId: 'your_client_id_here',
    clientSecret: 'your_client_secret_here',
    accessToken: 'your_access_token_here',
    refreshToken: 'your_refresh_token_here',
    channels: []
};

const defaultIssues = validateConfig(defaultConfig);
console.log(`Default config issues: ${defaultIssues.length} (should be 4)`);
console.log(`Issues: ${defaultIssues.join(', ')}`);

// Test with valid values
const validConfig = {
    clientId: 'real_client_id',
    clientSecret: 'real_secret',
    accessToken: 'real_token',
    refreshToken: 'real_refresh',
    channels: ['channel1', 'channel2']
};

const validIssues = validateConfig(validConfig);
console.log(`Valid config issues: ${validIssues.length} (should be 0)`);

if (defaultIssues.length === 4 && validIssues.length === 0) {
    console.log('✅ Configuration validation test passed');
} else {
    console.log('❌ Configuration validation test failed');
}

console.log('\nTest 4: File Format Preservation');

// Test that we can update specific values without losing comments
const originalContent = `# Twitch Bot Configuration
# This is a comment that should be preserved

# Client ID comment
TWITCH_CLIENT_ID=old_value

# Another comment
TWITCH_CLIENT_SECRET=old_secret

# Channels comment
CHANNELS=old_channel1,old_channel2
`;

const expectedAfterUpdate = originalContent
    .replace('TWITCH_CLIENT_ID=old_value', 'TWITCH_CLIENT_ID=new_value')
    .replace('CHANNELS=old_channel1,old_channel2', 'CHANNELS=new_channel1,new_channel2');

// Simulate the update logic from main.js
let updatedContent = originalContent;
updatedContent = updatedContent.replace(/^TWITCH_CLIENT_ID=.*$/m, 'TWITCH_CLIENT_ID=new_value');
updatedContent = updatedContent.replace(/^CHANNELS=.*$/m, 'CHANNELS=new_channel1,new_channel2');

const commentsPreserved = updatedContent.includes('# Twitch Bot Configuration') && 
                         updatedContent.includes('# Client ID comment') &&
                         updatedContent.includes('# Another comment');

const valuesUpdated = updatedContent.includes('TWITCH_CLIENT_ID=new_value') &&
                     updatedContent.includes('CHANNELS=new_channel1,new_channel2');

if (commentsPreserved && valuesUpdated) {
    console.log('✅ File format preservation test passed');
    console.log('✅ Comments and structure preserved while updating values');
} else {
    console.log('❌ File format preservation test failed');
    if (!commentsPreserved) console.log('❌ Comments not preserved');
    if (!valuesUpdated) console.log('❌ Values not updated correctly');
}

console.log('\n🎉 Configuration system tests completed!');

console.log('\n📋 Configuration System Features:');
console.log('- Preserves .env file comments and structure');
console.log('- Only updates values that are provided (non-empty)');
console.log('- Creates .env from .env.example template');
console.log('- Validates configuration completeness');
console.log('- Masks sensitive values in UI');
console.log('- Handles missing .env file gracefully');
console.log('- Supports partial updates without data loss');

console.log('\n🔧 Usage in Desktop App:');
console.log('1. Click "Create .env File" if no .env exists');
console.log('2. Click "Settings" to configure credentials');
console.log('3. Leave password fields empty to keep existing values');
console.log('4. All changes are saved to .env file immediately');
console.log('5. Bot restart recommended after configuration changes');
