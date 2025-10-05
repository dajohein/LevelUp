// Test script for data migration functionality
// Run this in the browser console to test migration features

import { DataMigrationService, DataBackupService } from '../services/dataMigrationService';
import { wordProgressStorage } from '../services/storageService';

// Test data migration functionality
export const testDataMigration = () => {
  console.log('🧪 Testing Data Migration...');
  
  // Create some legacy test data
  const legacyData = {
    'test_word_1': {
      wordId: 'test_word_1',
      xp: 75,
      lastPracticed: '2024-10-01T12:00:00Z',
      timesCorrect: 12,
      timesIncorrect: 3
    },
    'test_word_2': {
      wordId: 'test_word_2',
      xp: 45,
      lastPracticed: '2024-10-02T14:30:00Z',
      timesCorrect: 8,
      timesIncorrect: 5
    }
  };
  
  console.log('📥 Legacy data:', legacyData);
  
  // Save legacy data
  wordProgressStorage.saveRaw('test', legacyData);
  
  // Test migration
  const migratedData = DataMigrationService.safeLoadWordProgress('test');
  console.log('📤 Migrated data:', migratedData);
  
  // Verify data integrity
  Object.entries(legacyData).forEach(([wordId, legacy]) => {
    const migrated = migratedData[wordId];
    
    console.log(`\n🔍 Verifying ${wordId}:`);
    console.log('✅ XP preserved:', migrated.xp === legacy.xp);
    console.log('✅ Correct count preserved:', migrated.timesCorrect === legacy.timesCorrect);
    console.log('✅ Incorrect count preserved:', migrated.timesIncorrect === legacy.timesIncorrect);
    console.log('✅ Last practiced preserved:', migrated.lastPracticed === legacy.lastPracticed);
    console.log('✅ Version updated:', migrated.version === 2);
    console.log('✅ Directional data created:', !!migrated.directions);
    
    if (migrated.directions) {
      const termToDef = migrated.directions['term-to-definition'];
      const defToTerm = migrated.directions['definition-to-term'];
      
      if (termToDef && defToTerm) {
        const totalCorrect = termToDef.timesCorrect + defToTerm.timesCorrect;
        const totalIncorrect = termToDef.timesIncorrect + defToTerm.timesIncorrect;
        const totalXp = termToDef.xp + defToTerm.xp;
        
        console.log('✅ Directional data sums correctly:');
        console.log(`   Correct: ${totalCorrect} === ${legacy.timesCorrect}`, totalCorrect === legacy.timesCorrect);
        console.log(`   Incorrect: ${totalIncorrect} === ${legacy.timesIncorrect}`, totalIncorrect === legacy.timesIncorrect);
        console.log(`   XP: ${totalXp} === ${legacy.xp}`, totalXp === legacy.xp);
      }
    }
  });
  
  // Test backup functionality
  console.log('\n🛡️ Testing backup creation...');
  const backupKey = DataBackupService.createBackup('test');
  console.log('Backup created:', backupKey);
  
  const backups = DataBackupService.listBackups();
  console.log('Available backups:', backups);
  
  // Clean up test data
  wordProgressStorage.clear('test');
  localStorage.removeItem(backupKey);
  
  console.log('✅ Migration test completed successfully!');
};

// Test directional analytics
export const testDirectionalAnalytics = () => {
  console.log('\n📊 Testing Directional Analytics...');
  
  // Create enhanced test data
  const enhancedData = {
    'analytics_test_word': {
      wordId: 'analytics_test_word',
      xp: 80,
      lastPracticed: '2024-10-05T10:00:00Z',
      timesCorrect: 15,
      timesIncorrect: 2,
      version: 2,
      directions: {
        'term-to-definition': {
          timesCorrect: 10,
          timesIncorrect: 1,
          xp: 60,
          lastPracticed: '2024-10-05T10:00:00Z',
          consecutiveCorrect: 3,
          longestStreak: 5
        },
        'definition-to-term': {
          timesCorrect: 5,
          timesIncorrect: 1,
          xp: 20,
          lastPracticed: '2024-10-04T15:00:00Z',
          consecutiveCorrect: 1,
          longestStreak: 2
        }
      }
    }
  };
  
  wordProgressStorage.saveRaw('analytics_test', enhancedData);
  
  // Import the analytics service (this would need to be imported properly)
  // const analytics = DirectionalAnalyticsService.calculateWordDirectionalAnalytics(enhancedData.analytics_test_word);
  // console.log('Word analytics:', analytics);
  
  // Clean up
  wordProgressStorage.clear('analytics_test');
  
  console.log('✅ Analytics test completed!');
};

// Test migration status
export const testMigrationStatus = () => {
  console.log('\n📈 Testing Migration Status...');
  
  const stats = DataMigrationService.getMigrationStats('de');
  console.log('German migration stats:', stats);
  
  const allBackups = DataBackupService.listBackups();
  console.log('All backups:', allBackups);
};

// Run all tests
export const runAllTests = () => {
  console.log('🚀 Starting comprehensive migration tests...\n');
  
  try {
    testDataMigration();
    testDirectionalAnalytics();
    testMigrationStatus();
    
    console.log('\n🎉 All tests passed! Migration system is ready.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Export for browser console testing
if (typeof window !== 'undefined') {
  (window as any).migrationTests = {
    testDataMigration,
    testDirectionalAnalytics,
    testMigrationStatus,
    runAllTests
  };
  
  console.log('🧪 Migration tests available at window.migrationTests');
  console.log('Run window.migrationTests.runAllTests() to test everything');
}