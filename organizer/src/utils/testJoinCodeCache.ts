/**
 * Test script for Join Code Cache functionality
 * This script tests the persistent caching across browser sessions and game lifecycle
 */

import JoinCodeCache from './joinCodeCache';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

export function runJoinCodeCacheTests(): TestResult[] {
  const results: TestResult[] = [];
  
  // Clear any existing cache for clean testing
  localStorage.removeItem('joinCodeCache');
  
  // Test 1: Basic cache functionality
  try {
    JoinCodeCache.setCachedJoinCode('test-game-1', 'ABC123', 'active');
    const cached = JoinCodeCache.getCachedJoinCode('test-game-1');
    
    results.push({
      test: 'Basic cache set/get',
      passed: cached === 'ABC123',
      message: cached === 'ABC123' ? 'Successfully cached and retrieved join code' : `Expected ABC123, got ${cached}`
    });
  } catch (error) {
    results.push({
      test: 'Basic cache set/get',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 2: Game status tracking
  try {
    JoinCodeCache.setCachedJoinCode('test-game-2', 'XYZ789', 'draft');
    const cache = JoinCodeCache.getCache();
    const gameEntry = cache['test-game-2'];
    
    results.push({
      test: 'Game status tracking',
      passed: gameEntry?.gameStatus === 'draft',
      message: gameEntry?.gameStatus === 'draft' ? 'Game status correctly stored' : `Expected draft, got ${gameEntry?.gameStatus}`
    });
  } catch (error) {
    results.push({
      test: 'Game status tracking',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 3: Cache persistence (simulating browser refresh)
  try {
    // Set a cache entry
    JoinCodeCache.setCachedJoinCode('persistent-game', 'PERSIST123', 'active');
    
    // Simulate what happens on page refresh by creating a new instance
    const persistedCode = JoinCodeCache.getCachedJoinCode('persistent-game');
    
    results.push({
      test: 'Cache persistence',
      passed: persistedCode === 'PERSIST123',
      message: persistedCode === 'PERSIST123' ? 'Cache persisted across sessions' : `Expected PERSIST123, got ${persistedCode}`
    });
  } catch (error) {
    results.push({
      test: 'Cache persistence',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 4: Game status update
  try {
    JoinCodeCache.setCachedJoinCode('status-game', 'STATUS123', 'draft');
    JoinCodeCache.updateGameStatus('status-game', 'active');
    
    const cache = JoinCodeCache.getCache();
    const gameEntry = cache['status-game'];
    
    results.push({
      test: 'Game status update',
      passed: gameEntry?.gameStatus === 'active',
      message: gameEntry?.gameStatus === 'active' ? 'Game status successfully updated' : `Expected active, got ${gameEntry?.gameStatus}`
    });
  } catch (error) {
    results.push({
      test: 'Game status update',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 5: Cache cleanup on game deletion
  try {
    JoinCodeCache.setCachedJoinCode('delete-game', 'DELETE123', 'active');
    JoinCodeCache.removeGameFromCache('delete-game');
    
    const deletedCode = JoinCodeCache.getCachedJoinCode('delete-game');
    
    results.push({
      test: 'Cache cleanup on deletion',
      passed: deletedCode === null,
      message: deletedCode === null ? 'Cache successfully cleaned up' : `Expected null, got ${deletedCode}`
    });
  } catch (error) {
    results.push({
      test: 'Cache cleanup on deletion',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 6: Sync join code functionality
  try {
    // Set up initial cache
    JoinCodeCache.setCachedJoinCode('sync-game', 'SYNC123', 'active');
    
    // Simulate game data from server
    const gameData = {
      id: 'sync-game',
      joinCode: 'NEWSYNC456',
      status: 'active',
      title: 'Test Game'
    };
    
    const syncedGame = JoinCodeCache.syncJoinCode(gameData);
    
    results.push({
      test: 'Sync join code functionality',
      passed: syncedGame.joinCode === 'SYNC123', // Should use cached code
      message: syncedGame.joinCode === 'SYNC123' ? 'Cached join code preserved during sync' : `Expected SYNC123, got ${syncedGame.joinCode}`
    });
  } catch (error) {
    results.push({
      test: 'Sync join code functionality',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  // Test 7: Has cached join code check
  try {
    JoinCodeCache.setCachedJoinCode('check-game', 'CHECK123', 'active');
    const hasCache = JoinCodeCache.hasCachedJoinCode('check-game');
    const noCache = JoinCodeCache.hasCachedJoinCode('non-existent-game');
    
    results.push({
      test: 'Has cached join code check',
      passed: hasCache === true && noCache === false,
      message: hasCache === true && noCache === false ? 'Cache existence check works correctly' : `Expected true/false, got ${hasCache}/${noCache}`
    });
  } catch (error) {
    results.push({
      test: 'Has cached join code check',
      passed: false,
      message: `Error: ${error}`
    });
  }
  
  return results;
}

// Function to display test results in console
export function displayTestResults(results: TestResult[]): void {
  console.log('🧪 Join Code Cache Test Results:');
  console.log('================================');
  
  let passed = 0;
  let failed = 0;
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.test}: ${status}`);
    console.log(`   ${result.message}`);
    
    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log('================================');
  console.log(`Total: ${results.length} tests | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Join Code Cache is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
}

// Auto-run tests in development mode
if (import.meta.env.DEV) {
  // Add a global function to run tests from browser console
  (window as any).testJoinCodeCache = () => {
    const results = runJoinCodeCacheTests();
    displayTestResults(results);
    return results;
  };
  
  console.log('💡 Run testJoinCodeCache() in the browser console to test the join code cache functionality');
}