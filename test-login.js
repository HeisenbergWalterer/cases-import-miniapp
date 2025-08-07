const https = require('https');

const BASE_URL = 'https://ecd114a5180e.ngrok-free.app';

// 测试登录API
function testLoginAPI() {
  return new Promise((resolve, reject) => {
    const testData = {
      code: 'test_code_123',
      userInfo: {
        nickName: '测试用户',
        avatarUrl: 'https://example.com/avatar.jpg',
        gender: 1,
        country: 'China',
        province: 'Beijing',
        city: 'Beijing',
        language: 'zh_CN'
      }
    };

    const postData = JSON.stringify(testData);
    
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
        console.log('状态码:', res.statusCode);
        console.log('响应头:', res.headers);
        console.log('响应数据:', data);
        
        try {
          const result = JSON.parse(data);
          console.log('✅ 登录API测试通过:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ 登录API失败 - 响应不是JSON格式:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 登录API失败 - 网络错误:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// 测试健康检查
function testHealthCheck() {
  return new Promise((resolve, reject) => {
    const req = https.get(`${BASE_URL}/api/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('✅ 健康检查通过:', result);
          resolve(result);
        } catch (error) {
          console.log('❌ 健康检查失败:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 健康检查失败 - 网络错误:', error.message);
      reject(error);
    });
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始诊断登录问题...\n');
  
  try {
    // 1. 测试健康检查
    await testHealthCheck();
    
    console.log('\n--- 测试登录API ---');
    
    // 2. 测试登录API
    await testLoginAPI();
    
  } catch (error) {
    console.log('\n❌ 测试失败:', error.message);
  }
}

// 运行测试
runTests(); 