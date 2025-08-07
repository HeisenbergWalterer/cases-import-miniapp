const https = require('https');

const BASE_URL = 'https://ecd114a5180e.ngrok-free.app';

// 测试用户登录获取token
function testUserLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ 
      code: 'test_code_123',
      userInfo: {
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg'
      }
    });
    
    const options = {
      hostname: 'ecd114a5180e.ngrok-free.app',
      port: 443,
      path: '/api/user/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 用户登录测试通过:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ 用户登录失败:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 用户登录失败 - 网络错误:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试创建病例
function testCreateCase(token) {
  return new Promise((resolve, reject) => {
    const caseData = {
      patientName: '测试患者',
      gender: '男',
      age: 30,
      hospitalId: 'TEST001',
      pathologyId: 'PATH001',
      symptomDuration: '3',
      durationUnit: '天',
      comorbidities: ['高血压'],
      pastHistory: ['胆囊炎急性发作病史'],
      ultrasoundReport: '超声检查正常',
      pathologyReport: '病理检查正常'
    };

    const postData = JSON.stringify(caseData);
    
    const options = {
      hostname: 'ecd114a5180e.ngrok-free.app',
      port: 443,
      path: '/api/cases',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 创建病例测试通过:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ 创建病例失败:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 创建病例失败 - 网络错误:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试获取病例列表
function testGetCases(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'ecd114a5180e.ngrok-free.app',
      port: 443,
      path: '/api/cases',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 获取病例列表测试通过:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ 获取病例列表失败:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 获取病例列表失败 - 网络错误:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试病例相关API...\n');
  
  try {
    // 1. 用户登录获取token
    const loginResult = await testUserLogin();
    const token = loginResult.token;
    
    // 2. 创建病例
    const createResult = await testCreateCase(token);
    const caseId = createResult.caseId;
    
    // 3. 获取病例列表
    const casesResult = await testGetCases(token);
    
    console.log('\n🎉 所有病例功能测试通过！');
    console.log(`创建了病例ID: ${caseId}`);
    console.log(`病例列表包含 ${casesResult.cases?.length || 0} 个病例`);
    
  } catch (error) {
    console.log('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
runTests(); 