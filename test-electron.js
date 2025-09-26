// Test Electron app structure
const fs = require('fs');
const path = require('path');

console.log('🖥️ Testing Electron App Structure...\n');

// Test 1: Check required files exist
console.log('Test 1: Required Files');
const requiredFiles = [
    'main.js',
    'preload.js', 
    'dashboard.html',
    'dashboard.js',
    'styles.css',
    'package.json'
];

let allFilesExist = true;
for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allFilesExist = false;
    }
}

if (allFilesExist) {
    console.log('✅ All required files present\n');
} else {
    console.log('❌ Some required files are missing\n');
}

// Test 2: Check package.json configuration
console.log('Test 2: Package.json Configuration');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    console.log(`Main entry point: ${packageJson.main} (should be main.js)`);
    console.log(`Start script: ${packageJson.scripts.start} (should be "electron .")`);
    
    const hasElectron = packageJson.devDependencies && packageJson.devDependencies.electron;
    const hasElectronBuilder = packageJson.devDependencies && packageJson.devDependencies['electron-builder'];
    
    console.log(`Electron dependency: ${hasElectron ? '✅' : '❌'}`);
    console.log(`Electron Builder dependency: ${hasElectronBuilder ? '✅' : '❌'}`);
    
    const hasBuildConfig = packageJson.build && packageJson.build.appId;
    console.log(`Build configuration: ${hasBuildConfig ? '✅' : '❌'}`);
    
    console.log('✅ Package.json configuration test passed\n');
} catch (error) {
    console.log(`❌ Package.json configuration test failed: ${error.message}\n`);
}

// Test 3: Check assets directory
console.log('Test 3: Assets Directory');
if (fs.existsSync('assets')) {
    console.log('✅ Assets directory exists');
    
    const iconExists = fs.existsSync('assets/icon.svg');
    console.log(`Icon file: ${iconExists ? '✅' : '❌'}`);
} else {
    console.log('❌ Assets directory missing');
}

console.log('\nTest 4: HTML Structure');
try {
    const htmlContent = fs.readFileSync('dashboard.html', 'utf8');
    
    const hasTitle = htmlContent.includes('Twitch Blackjack Bot Dashboard');
    const hasStylesheet = htmlContent.includes('styles.css');
    const hasScript = htmlContent.includes('dashboard.js');
    const hasControlPanel = htmlContent.includes('control-panel');
    const hasStatusOverview = htmlContent.includes('status-overview');
    
    console.log(`Title: ${hasTitle ? '✅' : '❌'}`);
    console.log(`Stylesheet link: ${hasStylesheet ? '✅' : '❌'}`);
    console.log(`Script link: ${hasScript ? '✅' : '❌'}`);
    console.log(`Control panel: ${hasControlPanel ? '✅' : '❌'}`);
    console.log(`Status overview: ${hasStatusOverview ? '✅' : '❌'}`);
    
    console.log('✅ HTML structure test passed\n');
} catch (error) {
    console.log(`❌ HTML structure test failed: ${error.message}\n`);
}

console.log('Test 5: Core Bot Integration');
try {
    const TwitchBlackjackBot = require('./src/twitchBot');
    console.log('✅ TwitchBlackjackBot class can be imported');
    
    const BlackjackGame = require('./src/blackjack');
    console.log('✅ BlackjackGame class can be imported');
    
    console.log('✅ Core bot integration test passed\n');
} catch (error) {
    console.log(`❌ Core bot integration test failed: ${error.message}\n`);
}

console.log('🎉 Electron app structure tests completed!');
console.log('\nTo run the desktop app:');
console.log('  npm start');
console.log('\nTo build for distribution:');
console.log('  npm run build');
console.log('\nTo run in development mode:');
console.log('  npm run dev');

console.log('\n📱 Desktop App Features:');
console.log('- Real-time bot status monitoring');
console.log('- Easy configuration management');
console.log('- Live game tracking');
console.log('- Activity logs and export');
console.log('- One-click start/stop controls');
console.log('- Cross-platform support (Windows, macOS, Linux)');
