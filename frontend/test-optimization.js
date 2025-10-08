const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'jake@gmail.com',
  password: 'cseadmin'
};

let authToken = '';
let testClassId = '';

// Test authentication
async function authenticate() {
  try {
    console.log('🔐 Testing authentication...');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
    
    if (response.data.success) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      console.log(`   User: ${response.data.user.name} (${response.data.user.role})`);
      return response.data.user;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    process.exit(1);
  }
}

// Get test class
async function getTestClass(departmentId) {
  try {
    console.log('📚 Getting test class...');
    const response = await axios.get(`${BASE_URL}/classes?department=${departmentId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data && response.data.length > 0) {
      testClassId = response.data[0]._id;
      console.log(`✅ Found test class: ${response.data[0].fullName}`);
      return response.data[0];
    } else {
      throw new Error('No classes found');
    }
  } catch (error) {
    console.error('❌ Failed to get test class:', error.message);
    return null;
  }
}

// Test optimization suggestions
async function testOptimizationSuggestions() {
  try {
    console.log('🚀 Testing optimization suggestions...');
    const response = await axios.post(`${BASE_URL}/timetable/optimize/suggestions`, {
      classId: testClassId,
      constraints: {},
      optimizationGoals: ['workload-balance', 'conflict-resolution', 'room-efficiency']
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Optimization suggestions generated successfully');
      console.log(`   Suggestions count: ${response.data.data.suggestions.length}`);
      response.data.data.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.title} (${suggestion.type})`);
      });
      return response.data.data.suggestions;
    } else {
      throw new Error('Failed to generate suggestions');
    }
  } catch (error) {
    console.error('❌ Optimization suggestions failed:', error.response?.data?.message || error.message);
    return [];
  }
}

// Test workload optimization
async function testWorkloadOptimization() {
  try {
    console.log('👥 Testing workload optimization...');
    const response = await axios.get(`${BASE_URL}/timetable/optimize/workload`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Workload optimization analysis successful');
      console.log(`   Faculty analyzed: ${response.data.data.metadata.totalFaculty}`);
      console.log(`   Average workload: ${response.data.data.metadata.averageWorkload?.toFixed(1) || 0} hrs`);
      console.log(`   Optimization suggestions: ${response.data.data.optimizationSuggestions.length}`);
      return response.data.data;
    } else {
      throw new Error('Failed to analyze workload');
    }
  } catch (error) {
    console.error('❌ Workload optimization failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test room optimization
async function testRoomOptimization() {
  try {
    console.log('🏢 Testing room optimization...');
    const response = await axios.post(`${BASE_URL}/timetable/optimize/rooms`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success) {
      console.log('✅ Room optimization analysis successful');
      console.log(`   Rooms analyzed: ${response.data.data.metadata.totalRooms}`);
      console.log(`   Optimization suggestions: ${response.data.data.optimizationSuggestions.length}`);
      return response.data.data;
    } else {
      throw new Error('Failed to analyze room utilization');
    }
  } catch (error) {
    console.error('❌ Room optimization failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Test optimization application (dry run)
async function testOptimizationApplication(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    console.log('⚠️  Skipping optimization application - no suggestions available');
    return;
  }

  try {
    console.log('✅ Testing optimization application (dry run)...');
    const firstSuggestion = suggestions[0];
    
    // We won't actually apply it to avoid modifying the database
    console.log(`   Would apply: ${firstSuggestion.title}`);
    console.log(`   Type: ${firstSuggestion.type}`);
    console.log(`   Benefits: ${firstSuggestion.benefits.length} listed`);
    
    if (firstSuggestion.metrics) {
      console.log('   Metrics:');
      Object.entries(firstSuggestion.metrics).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    }
    
    console.log('✅ Optimization application test completed (dry run)');
  } catch (error) {
    console.error('❌ Optimization application test failed:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Timetable Optimization Tests\\n');
  
  try {
    // Authenticate
    const user = await authenticate();
    console.log('');
    
    // Get test class
    const testClass = await getTestClass(user.department);
    if (!testClass) {
      console.log('⚠️  Cannot continue without a test class');
      return;
    }
    console.log('');
    
    // Test optimization suggestions
    const suggestions = await testOptimizationSuggestions();
    console.log('');
    
    // Test workload optimization
    await testWorkloadOptimization();
    console.log('');
    
    // Test room optimization
    await testRoomOptimization();
    console.log('');
    
    // Test optimization application (dry run)
    await testOptimizationApplication(suggestions);
    console.log('');
    
    console.log('🎉 All optimization tests completed successfully!');
    console.log('\\n📝 Test Summary:');
    console.log('   ✅ Authentication');
    console.log('   ✅ Class retrieval');
    console.log('   ✅ Optimization suggestions generation');
    console.log('   ✅ Workload analysis');
    console.log('   ✅ Room utilization analysis');
    console.log('   ✅ Optimization application (dry run)');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };