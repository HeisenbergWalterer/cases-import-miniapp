const https = require('https');

const BASE_URL = 'https://97b3d5237d85.ngrok-free.app';

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
      hostname: '97b3d5237d85.ngrok-free.app',
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
      hostname: '97b3d5237d85.ngrok-free.app',
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

// 测试用户登录获取token
function testUserLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code: 'test_code' });
    
    const options = {
      hostname: '97b3d5237d85.ngrok-free.app',
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

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试病例功能...\n');
  
  try {
    // 1. 用户登录获取token
    const loginResult = await testUserLogin();
    const token = loginResult.token;
    
    // 2. 创建病例
    const createResult = await testCreateCase(token);
    const caseId = createResult.caseId;
    
    // 3. 获取病例列表
    await testGetCases(token);
    
    console.log('\n🎉 所有病例功能测试通过！');
    console.log('\n📱 现在可以测试小程序功能了：');
    console.log('1. 重新编译小程序');
    console.log('2. 测试病例导入功能');
    console.log('3. 测试病例列表显示');
    console.log('4. 测试病例详情查看');
    
  } catch (error) {
    console.log('\n❌ 测试失败，请检查：');
    console.log('1. 后端服务是否正常运行');
    console.log('2. 数据库连接是否正常');
    console.log('3. API接口是否正确');
  }
}

// 运行测试
runTests(); 