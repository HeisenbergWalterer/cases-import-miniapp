const https = require('https');

const BASE_URL = 'https://ecd114a5180e.ngrok-free.app';

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
          console.log('❌ 健康检查失败 - 返回HTML页面');
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ 健康检查失败 - 网络错误:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ 健康检查超时');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// 测试用户登录
function testUserLogin() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ code: 'test_code' });
    
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

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试部署状态...\n');
  
  try {
    // 测试健康检查
    await testHealthCheck();
    
    // 测试用户登录
    await testUserLogin();
    
    console.log('\n🎉 所有测试通过！部署成功！');
    console.log('\n📱 现在可以测试小程序功能了：');
    console.log('1. 打开微信开发者工具');
    console.log('2. 导入小程序项目');
    console.log('3. 测试登录、病例导入等功能');
    
  } catch (error) {
    console.log('\n❌ 测试失败，请检查：');
    console.log('1. 后端服务是否启动 (pm2 status)');
    console.log('2. ngrok是否正常运行');
    console.log('3. 数据库是否连接正常');
    console.log('4. 防火墙是否开放端口');
  }
}

// 运行测试
runTests(); 