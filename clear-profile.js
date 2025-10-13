// Clear the existing problematic profile data
const profileKey = 'user-learning-profile-default-user';

// Remove from localStorage
localStorage.removeItem(profileKey);

console.log('✅ Cleared existing profile data. The system will create a fresh profile.');
console.log('Please refresh the page to generate a new learning profile.');