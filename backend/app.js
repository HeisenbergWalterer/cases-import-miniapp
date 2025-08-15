const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { OpenAI } = require('openai');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'appuser',
  password: 'apppassword',
  database: 'cases_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建数据库连接池
const pool = mysql.createPool(dbConfig);

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 微信配置
const WECHAT_APPID = 'wx8f3346035dc6939e';
const WECHAT_SECRET = '6fa732da3b8f2602a07b1689b5190f16';

// DeepSeek AI 配置
const DEEPSEEK_CONFIG = {
  api_base: 'http://10.91.11.250:8080/v1',
  api_key: 'EMPTY',
  model: '/root/deepseek-r1-32b'  // 正确的模型ID，根据API返回结果
};

// 初始化DeepSeek客户端
const deepseekClient = new OpenAI({
  apiKey: DEEPSEEK_CONFIG.api_key,
  baseURL: DEEPSEEK_CONFIG.api_base
});

// 医疗专用系统提示词
const MEDICAL_SYSTEM_PROMPT = `您是专业的医疗AI助手。

**回答要求：**
- 回答简洁明了，控制在100字以内
- 直接给出医疗建议，不要冗长解释
- 使用简单易懂的语言
- 严重症状立即建议就医

**请直接回答，不要显示思考过程。**`;

// 简单提取AI最终回答（根据</think>标签）
function extractActualAnswer(content) {
  if (!content) return '';
  
  console.log('=== 内容提取调试 ===');
  console.log('原始内容长度:', content.length);
  console.log('原始内容:', content);
  
  // 查找</think>标签
  const thinkEndIndex = content.lastIndexOf('</think>');
  
  if (thinkEndIndex !== -1) {
    console.log('找到</think>标签位置:', thinkEndIndex);
    
    // 提取</think>之后的内容
    let answer = content.substring(thinkEndIndex + '</think>'.length);
    
    // 清理开头的空白字符和换行符
    answer = answer.replace(/^\s*\n*\s*/, '').trim();
    
    console.log('提取的答案长度:', answer.length);
    console.log('提取的答案内容:', answer);
    console.log('=== 提取完成 ===');
    
    // 如果提取的答案为空或太短，返回原内容
    if (!answer || answer.length < 5) {
      console.warn('提取的答案太短，返回原内容');
      return content;
    }
    
    return answer;
  }
  
  console.log('未找到</think>标签，返回原内容');
  console.log('=== 提取完成 ===');
  
  // 没有找到</think>标签，返回原内容
  return content;
}



// 获取微信openid
async function getWechatOpenId(code) {
  try {
    console.log('开始获取微信openid，code:', code);
    
    // 测试模式：如果code以test_开头，返回模拟的openid
    if (code.startsWith('test_')) {
      console.log('使用测试模式，返回模拟openid');
      return `test_openid_${Date.now()}`;
    }
    
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`;
    console.log('请求微信API URL:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('微信API响应:', data);
    
    if (data.openid) {
      console.log('成功获取openid:', data.openid);
      return data.openid;
    } else {
      console.error('微信API返回错误:', data);
      if (data.errcode) {
        console.error('错误代码:', data.errcode, '错误信息:', data.errmsg);
      }
      return null;
    }
  } catch (error) {
    console.error('获取微信openid失败:', error);
    return null;
  }
}

// 健康检查API
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务正常运行', timestamp: new Date().toISOString() });
});

// 用户登录API
app.post('/api/user/login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;
    
    console.log('收到登录请求:', { code: code ? '有code' : '无code', userInfo: userInfo ? '有用户信息' : '无用户信息' });
    
    if (!code) {
      return res.status(400).json({ success: false, message: '缺少登录code' });
    }
    
    // 调用微信API获取openid
    const openid = await getWechatOpenId(code);
    
    console.log('获取到的openid:', openid);
    
    if (!openid) {
      return res.status(400).json({ success: false, message: '获取openid失败' });
    }
    
    // 检查用户是否存在
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE openid = ?',
      [openid]
    );
    
    let user;
    if (users.length === 0) {
      // 创建新用户
      console.log('创建新用户:', { openid, name: userInfo?.nickName || '微信用户' });
      const [result] = await pool.execute(
        'INSERT INTO users (openid, name, avatar_url, created_at) VALUES (?, ?, ?, NOW())',
        [openid, userInfo?.nickName || '微信用户', userInfo?.avatarUrl || '']
      );
      user = { 
        id: result.insertId, 
        openid,
        name: userInfo?.nickName || '微信用户',
        avatar_url: userInfo?.avatarUrl || '',
        gender: null,
        age: null,
        phone: null
      };
    } else {
      user = users[0];
      console.log('用户已存在:', { id: user.id, name: user.name });
      // 更新用户基本信息（昵称和头像）

      // 智能更新：只有当用户还没有设置过自定义姓名时，才更新姓名
      const shouldUpdateName = !user.name || user.name === '微信用户';
      if (shouldUpdateName && userInfo?.nickName && userInfo.nickName !== '微信用户') {
        // 用户没有自定义姓名，且微信返回了有效昵称，则更新姓名和头像
        await pool.execute(
          'UPDATE users SET name = ?, avatar_url = ?, updated_at = NOW() WHERE id = ?',
          [userInfo.nickName, userInfo?.avatarUrl || user.avatar_url || '', user.id]
        );
      } else {
        // 用户已有自定义姓名，只更新头像，保留用户自定义的姓名
        await pool.execute(
          'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
          [userInfo?.avatarUrl || user.avatar_url || '', user.id]
        );
      }
    }
    
    // 生成JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    console.log('登录成功，返回token和用户信息');
    
    res.json({
      success: true,
      token,
      userInfo: {
        id: user.id,
        openid: user.openid,
        name: user.name,
        avatarUrl: user.avatar_url
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 获取用户信息API
app.get('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const user = users[0];
    
    res.json({ 
      success: true, 
      userInfo: {
        id: user.id,
        openid: user.openid,
        name: user.name,
        gender: user.gender,
        age: user.age,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// 更新用户信息API
app.put('/api/user/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const { name, gender, age, phone } = req.body;
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 更新用户信息
    await pool.execute(
      'UPDATE users SET name = ?, gender = ?, age = ?, phone = ?, updated_at = NOW() WHERE id = ?',
      [name, gender, age, phone, decoded.userId]
    );
    
    res.json({ success: true, message: '用户信息更新成功' });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({ success: false, message: '更新用户信息失败' });
  }
});

// 创建病例API - 确保正确的JSON处理
app.post('/api/cases', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const caseData = req.body;
    
    console.log('创建病例 - 接收到的数据:', JSON.stringify(caseData, null, 2));
    
    // 数据验证
    if (!caseData.patient?.name || !caseData.patient.name.trim()) {
      return res.status(400).json({ success: false, message: '患者姓名不能为空' });
    }
    
    if (!caseData.symptoms?.duration || !caseData.symptoms?.durationUnit) {
      return res.status(400).json({ success: false, message: '症状信息不完整' });
    }
    
    // 确保使用 JSON.stringify 来存储数组数据
    const [result] = await pool.execute(
      `INSERT INTO cases (user_id, patient_name, gender, age, 
        symptom_duration, duration_unit, comorbidities, 
        past_history, ultrasound_report, pathology_report, 
        case_data, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        decoded.userId,
        caseData.patient.name.trim(),
        caseData.patient.gender || null,
        caseData.patient.age || null,
        caseData.symptoms.duration,
        caseData.symptoms.durationUnit,
        JSON.stringify(caseData.medicalHistory?.comorbidities || []), // 关键：使用JSON.stringify
        JSON.stringify(caseData.medicalHistory?.pastHistory || []),   // 关键：使用JSON.stringify
        caseData.reports?.ultrasound || '',
        caseData.reports?.pathology || '',
        JSON.stringify(caseData) // 保存完整的JSON数据
      ]
    );
    
    console.log('病例创建成功，ID:', result.insertId);
    
    res.json({ 
      success: true, 
      caseId: result.insertId,
      message: '病例创建成功'
    });
  } catch (error) {
    console.error('创建病例失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

// 获取病例列表API - 支持JSON格式 + 安全JSON解析
app.get('/api/cases', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 添加详细的调试信息
    console.log('=== 获取病例列表API调试信息 ===');
    console.log('Token前缀:', token.substring(0, 20) + '...');
    console.log('解码用户ID:', decoded.userId);
    console.log('查询时间:', new Date().toISOString());
    
    const [cases] = await pool.execute(
      'SELECT * FROM cases WHERE user_id = ? ORDER BY created_at DESC',
      [decoded.userId]
    );
    
    console.log('数据库查询结果 - 病例数量:', cases.length);
    
    // 增强的JSON解析函数，处理各种数据类型
    function safeJSONParse(jsonData, defaultValue = [], fieldName = 'unknown') {
      console.log(`--- ${fieldName} JSON解析开始 ---`);
      console.log(`输入数据:`, jsonData);
      console.log(`数据类型: ${typeof jsonData}`);
      console.log(`是否为null/undefined: ${jsonData == null}`);
      
      if (!jsonData) {
        console.log(`${fieldName}: 输入为空，返回默认值:`, defaultValue);
        return defaultValue;
      }
      
      // 如果已经是数组或对象，直接返回
      if (Array.isArray(jsonData)) {
        console.log(`${fieldName}: 输入已经是数组:`, jsonData);
        return jsonData;
      }
      
      if (typeof jsonData === 'object' && jsonData !== null) {
        console.log(`${fieldName}: 输入已经是对象:`, jsonData);
        return jsonData;
      }
      
      // 转换为字符串（处理Buffer等类型）
      let jsonString;
      try {
        if (Buffer.isBuffer(jsonData)) {
          jsonString = jsonData.toString('utf8');
          console.log(`${fieldName}: Buffer转换为字符串: "${jsonString}"`);
        } else {
          jsonString = String(jsonData);
          console.log(`${fieldName}: 转换为字符串: "${jsonString}"`);
        }
      } catch (error) {
        console.error(`${fieldName}: 转换字符串失败:`, error.message);
        return defaultValue;
      }
      
      try {
        console.log(`${fieldName}: 尝试直接JSON.parse...`);
        const result = JSON.parse(jsonString);
        console.log(`${fieldName}: 直接解析成功:`, result);
        console.log(`${fieldName}: 结果类型: ${typeof result}, 是否为数组: ${Array.isArray(result)}`);
        return result;
      } catch (error) {
        console.log(`${fieldName}: 直接解析失败，错误:`, error.message);
        console.log(`${fieldName}: 开始修复流程...`);
        
        try {
          // 尝试修复常见的JSON格式问题
          let fixedJson = jsonString
            .replace(/'/g, '"')  // 单引号改为双引号
            .replace(/(\w+):/g, '"$1":')  // 为属性名添加引号
            .trim();
          
          console.log(`${fieldName}: 修复后的JSON: "${fixedJson}"`);
          
          // 如果看起来像数组但格式不对，尝试修复
          if (fixedJson.startsWith('[') && fixedJson.endsWith(']')) {
            console.log(`${fieldName}: 检测为数组格式，尝试解析...`);
            const result = JSON.parse(fixedJson);
            console.log(`${fieldName}: 数组解析成功:`, result);
            return result;
          }
          
          // 如果是逗号分隔的字符串，转换为数组
          if (fixedJson.includes(',') && !fixedJson.startsWith('[')) {
            console.log(`${fieldName}: 检测为逗号分隔格式，分割处理...`);
            const result = fixedJson.split(',').map(item => item.trim().replace(/['"]/g, ''));
            console.log(`${fieldName}: 分割结果:`, result);
            return result;
          }
          
          // 如果是单个值，包装成数组
          console.log(`${fieldName}: 检测为单值，包装成数组...`);
          const result = [fixedJson.replace(/['"]/g, '')];
          console.log(`${fieldName}: 包装结果:`, result);
          return result;
          
        } catch (secondError) {
          console.error(`${fieldName}: 修复也失败:`, secondError.message);
          console.error(`${fieldName}: 返回默认值:`, defaultValue);
          return defaultValue;
        }
      } finally {
        console.log(`--- ${fieldName} JSON解析结束 ---\n`);
      }
    }
    
    // 格式化病例数据，使用安全解析
    const formattedCases = cases.map((caseItem, index) => {
      try {
        console.log(`\n处理第${index + 1}个病例 (ID: ${caseItem.id}):`);
        
        // 处理字符串字段的Buffer类型（病例列表专用）
        function safeStringConvertList(data, fieldName = 'unknown') {
          if (!data) return '';
          if (typeof data === 'string') return data;
          try {
            if (Buffer.isBuffer(data)) {
              return data.toString('utf8');
            } else {
              return String(data);
            }
          } catch (error) {
            console.error(`${fieldName}: 转换失败:`, error.message);
            return '';
          }
        }

        const baseCase = {
          id: caseItem.id,
          patient_name: caseItem.patient_name,
          gender: caseItem.gender,
          age: caseItem.age,
          symptom_duration: caseItem.symptom_duration,
          duration_unit: caseItem.duration_unit,
          comorbidities: safeJSONParse(caseItem.comorbidities, [], `病例${caseItem.id}-合并疾病`),
          past_history: safeJSONParse(caseItem.past_history, [], `病例${caseItem.id}-既往病史`),
          ultrasound_report: safeStringConvertList(caseItem.ultrasound_report, `病例${caseItem.id}-B超报告`),
          pathology_report: safeStringConvertList(caseItem.pathology_report, `病例${caseItem.id}-病理报告`),
          created_at: caseItem.created_at,
          updated_at: caseItem.updated_at
        };
        
        // 如果有完整JSON数据，也安全解析
        if (caseItem.case_data) {
          baseCase.case_data = safeJSONParse(caseItem.case_data, {}, `病例${caseItem.id}-完整数据`);
        }
        
        console.log(`第${index + 1}个病例最终结果:`, {
          id: baseCase.id,
          comorbidities: baseCase.comorbidities,
          past_history: baseCase.past_history
        });
        
        return baseCase;
      } catch (error) {
        console.error(`处理第${index + 1}个病例失败:`, error);
        console.error('病例原始数据:', caseItem);
        
        // 返回基本的安全数据
        return {
          id: caseItem.id,
          patient_name: caseItem.patient_name || '未知患者',
          gender: caseItem.gender || '未设置',
          age: caseItem.age || 0,
          symptom_duration: caseItem.symptom_duration || 0,
          duration_unit: caseItem.duration_unit || '',
          comorbidities: [],
          past_history: [],
          ultrasound_report: caseItem.ultrasound_report || '',
          pathology_report: caseItem.pathology_report || '',
          created_at: caseItem.created_at,
          updated_at: caseItem.updated_at
        };
      }
    });
    
    console.log('格式化后返回的病例数量:', formattedCases.length);
    console.log('=== 调试信息结束 ===\n');
    
    res.json({ success: true, cases: formattedCases });
  } catch (error) {
    console.error('获取病例列表失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '获取失败', error: error.message });
  }
});

// 获取病例详情API - 支持JSON格式 + 安全JSON解析 + 详细调试
app.get('/api/cases/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const caseId = req.params.id;
    
    console.log('=== 获取病例详情API调试信息 ===');
    console.log('病例ID:', caseId);
    console.log('用户ID:', decoded.userId);
    
    const [cases] = await pool.execute(
      'SELECT * FROM cases WHERE id = ? AND user_id = ?',
      [caseId, decoded.userId]
    );
    
    console.log('查询结果数量:', cases.length);
    
    if (cases.length === 0) {
      console.log('病例不存在或无权限访问');
      return res.status(404).json({ success: false, message: '病例不存在' });
    }
    
    const caseData = cases[0];
    console.log('原始病例数据详情:', {
      id: caseData.id,
      patient_name: caseData.patient_name,
      comorbidities_raw: caseData.comorbidities,
      comorbidities_type: typeof caseData.comorbidities,
      past_history_raw: caseData.past_history,
      past_history_type: typeof caseData.past_history,
      ultrasound_report_exists: !!caseData.ultrasound_report,
      pathology_report_exists: !!caseData.pathology_report
    });
    
    // 增强的JSON解析函数，处理各种数据类型
    function safeJSONParse(jsonData, defaultValue = [], fieldName = 'unknown') {
      console.log(`\n--- ${fieldName} JSON解析开始 ---`);
      console.log(`输入数据:`, jsonData);
      console.log(`数据类型: ${typeof jsonData}`);
      console.log(`是否为null/undefined: ${jsonData == null}`);
      
      if (!jsonData) {
        console.log(`${fieldName}: 输入为空，返回默认值:`, defaultValue);
        return defaultValue;
      }
      
      // 如果已经是数组或对象，直接返回
      if (Array.isArray(jsonData)) {
        console.log(`${fieldName}: 输入已经是数组:`, jsonData);
        return jsonData;
      }
      
      if (typeof jsonData === 'object' && jsonData !== null) {
        console.log(`${fieldName}: 输入已经是对象:`, jsonData);
        return jsonData;
      }
      
      // 转换为字符串（处理Buffer等类型）
      let jsonString;
      try {
        if (Buffer.isBuffer(jsonData)) {
          jsonString = jsonData.toString('utf8');
          console.log(`${fieldName}: Buffer转换为字符串: "${jsonString}"`);
        } else {
          jsonString = String(jsonData);
          console.log(`${fieldName}: 转换为字符串: "${jsonString}"`);
        }
      } catch (error) {
        console.error(`${fieldName}: 转换字符串失败:`, error.message);
        return defaultValue;
      }
      
      try {
        console.log(`${fieldName}: 尝试直接JSON.parse...`);
        const result = JSON.parse(jsonString);
        console.log(`${fieldName}: 直接解析成功:`, result);
        console.log(`${fieldName}: 结果类型: ${typeof result}, 是否为数组: ${Array.isArray(result)}`);
        return result;
      } catch (error) {
        console.log(`${fieldName}: 直接解析失败，错误:`, error.message);
        console.log(`${fieldName}: 开始修复流程...`);
        
        try {
          // 尝试修复常见的JSON格式问题
          let fixedJson = jsonString
            .replace(/'/g, '"')  // 单引号改为双引号
            .replace(/(\w+):/g, '"$1":')  // 为属性名添加引号
            .trim();
          
          console.log(`${fieldName}: 修复后的JSON: "${fixedJson}"`);
          
          // 如果看起来像数组但格式不对，尝试修复
          if (fixedJson.startsWith('[') && fixedJson.endsWith(']')) {
            console.log(`${fieldName}: 检测为数组格式，尝试解析...`);
            const result = JSON.parse(fixedJson);
            console.log(`${fieldName}: 数组解析成功:`, result);
            return result;
          }
          
          // 如果是逗号分隔的字符串，转换为数组
          if (fixedJson.includes(',') && !fixedJson.startsWith('[')) {
            console.log(`${fieldName}: 检测为逗号分隔格式，分割处理...`);
            const result = fixedJson.split(',').map(item => item.trim().replace(/['"]/g, ''));
            console.log(`${fieldName}: 分割结果:`, result);
            return result;
          }
          
          // 如果是单个值，包装成数组
          console.log(`${fieldName}: 检测为单值，包装成数组...`);
          const result = [fixedJson.replace(/['"]/g, '')];
          console.log(`${fieldName}: 包装结果:`, result);
          return result;
          
        } catch (secondError) {
          console.error(`${fieldName}: 修复也失败:`, secondError.message);
          console.error(`${fieldName}: 返回默认值:`, defaultValue);
          return defaultValue;
        }
      } finally {
        console.log(`--- ${fieldName} JSON解析结束 ---\n`);
      }
    }
    
    // 处理字符串字段的Buffer类型
    function safeStringConvert(data, fieldName = 'unknown') {
      console.log(`\n--- ${fieldName} 字符串转换开始 ---`);
      console.log(`输入数据:`, data);
      console.log(`数据类型: ${typeof data}`);
      
      if (!data) {
        console.log(`${fieldName}: 输入为空，返回空字符串`);
        return '';
      }
      
      if (typeof data === 'string') {
        console.log(`${fieldName}: 已经是字符串:`, data.substring(0, 50) + (data.length > 50 ? '...' : ''));
        return data;
      }
      
      try {
        if (Buffer.isBuffer(data)) {
          const result = data.toString('utf8');
          console.log(`${fieldName}: Buffer转换为字符串:`, result.substring(0, 50) + (result.length > 50 ? '...' : ''));
          return result;
        } else {
          const result = String(data);
          console.log(`${fieldName}: 强制转换为字符串:`, result.substring(0, 50) + (result.length > 50 ? '...' : ''));
          return result;
        }
      } catch (error) {
        console.error(`${fieldName}: 转换失败:`, error.message);
        return '';
      } finally {
        console.log(`--- ${fieldName} 字符串转换结束 ---\n`);
      }
    }

    try {
      const formattedCase = {
        id: caseData.id,
        patient_name: caseData.patient_name,
        gender: caseData.gender,
        age: caseData.age,
        symptom_duration: caseData.symptom_duration,
        duration_unit: caseData.duration_unit,
        comorbidities: safeJSONParse(caseData.comorbidities, [], '病例详情-合并疾病'),
        past_history: safeJSONParse(caseData.past_history, [], '病例详情-既往病史'),
        ultrasound_report: safeStringConvert(caseData.ultrasound_report, '病例详情-B超报告'),
        pathology_report: safeStringConvert(caseData.pathology_report, '病例详情-病理报告'),
        created_at: caseData.created_at,
        updated_at: caseData.updated_at
      };
      
      // 如果有完整JSON数据，也安全解析
      if (caseData.case_data) {
        try {
          formattedCase.case_data = safeJSONParse(caseData.case_data, {}, '病例详情-完整数据');
        } catch (error) {
          console.warn('解析case_data失败:', error);
          formattedCase.case_data = {};
        }
      }
      
      console.log('\n格式化后的最终病例数据:', {
        id: formattedCase.id,
        patient_name: formattedCase.patient_name,
        comorbidities: formattedCase.comorbidities,
        comorbidities_length: formattedCase.comorbidities?.length,
        past_history: formattedCase.past_history,
        past_history_length: formattedCase.past_history?.length,
        ultrasound_report_preview: formattedCase.ultrasound_report?.substring(0, 30) + (formattedCase.ultrasound_report?.length > 30 ? '...' : ''),
        ultrasound_report_length: formattedCase.ultrasound_report?.length || 0,
        pathology_report_preview: formattedCase.pathology_report?.substring(0, 30) + (formattedCase.pathology_report?.length > 30 ? '...' : ''),
        pathology_report_length: formattedCase.pathology_report?.length || 0
      });
      console.log('=== 病例详情调试信息结束 ===\n');
      
      res.json({ success: true, caseData: formattedCase });
    } catch (formatError) {
      console.error('格式化病例数据失败:', formatError);
      
      // 返回基本的安全数据
      const safeCaseData = {
        id: caseData.id,
        patient_name: caseData.patient_name || '未知患者',
        gender: caseData.gender || '未设置',
        age: caseData.age || 0,
        symptom_duration: caseData.symptom_duration || 0,
        duration_unit: caseData.duration_unit || '',
        comorbidities: [],
        past_history: [],
        ultrasound_report: caseData.ultrasound_report || '',
        pathology_report: caseData.pathology_report || '',
        created_at: caseData.created_at,
        updated_at: caseData.updated_at
      };
      
      res.json({ success: true, caseData: safeCaseData });
    }
    
  } catch (error) {
    console.error('获取病例详情失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: '获取失败',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 删除病例API
app.delete('/api/cases/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const caseId = req.params.id;
    
    const [result] = await pool.execute(
      'DELETE FROM cases WHERE id = ? AND user_id = ?',
      [caseId, decoded.userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '病例不存在或无权限删除' });
    }
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除病例失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ============== AI聊天相关API ==============

// AI聊天API - 发送消息并获取AI回复
app.post('/api/chat/message', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const { message, chatId, contextMessages = [] } = req.body;
    
    console.log('=== AI聊天API调试信息 ===');
    console.log('用户ID:', decoded.userId);
    console.log('聊天ID:', chatId);
    console.log('用户消息:', message);
    console.log('上下文消息数量:', contextMessages.length);
    
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: '消息内容不能为空' });
    }
    
    // 构建消息历史，包含系统提示词
    const messages = [
      { role: 'system', content: MEDICAL_SYSTEM_PROMPT }
    ];
    
    // 添加上下文消息（最近的10条消息以保持性能）
    const recentContext = contextMessages.slice(-10);
    recentContext.forEach(ctx => {
      if (ctx.type === 'user') {
        messages.push({ role: 'user', content: ctx.content });
      } else if (ctx.type === 'ai') {
        messages.push({ role: 'assistant', content: ctx.content });
      }
    });
    
    // 添加当前用户消息
    messages.push({ role: 'user', content: message.trim() });
    
    console.log('发送给DeepSeek的消息数量:', messages.length);
    
    try {
      // 调用DeepSeek API
      const aiResponse = await deepseekClient.chat.completions.create({
        model: DEEPSEEK_CONFIG.model,
        messages: messages,
        max_tokens: 300, // 增加token给思考+回答留足空间
        temperature: 0.7,
        top_p: 0.95,
        stream: false
      });
      
      const rawAiContent = aiResponse.choices[0]?.message?.content;
      
      if (!rawAiContent) {
        throw new Error('AI响应为空');
      }
      
      // 简单提取最终回答（根据</think>标签）
      const aiContent = extractActualAnswer(rawAiContent);
      
      console.log('DeepSeek AI响应成功');
      console.log('原始响应长度:', rawAiContent.length);
      console.log('提取后回答长度:', aiContent.length);
      
      // 保存聊天记录到数据库
      let actualChatId = chatId;
      
      if (!chatId) {
        // 创建新的聊天会话
        const chatTitle = message.length > 20 ? message.substring(0, 20) + '...' : message;
        const [chatResult] = await pool.execute(
          'INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [decoded.userId, chatTitle]
        );
        actualChatId = chatResult.insertId;
        console.log('创建新聊天会话, ID:', actualChatId);
      } else {
        // 更新现有聊天会话的时间
        await pool.execute(
          'UPDATE chat_sessions SET updated_at = NOW() WHERE id = ? AND user_id = ?',
          [chatId, decoded.userId]
        );
      }
      
      // 保存用户消息
      await pool.execute(
        `INSERT INTO chat_messages (chat_session_id, message_type, content, created_at) 
         VALUES (?, 'user', ?, NOW())`,
        [actualChatId, message.trim()]
      );
      
      // 保存AI回复
      await pool.execute(
        `INSERT INTO chat_messages (chat_session_id, message_type, content, created_at) 
         VALUES (?, 'ai', ?, NOW())`,
        [actualChatId, aiContent]
      );
      
      console.log('聊天记录保存成功');
      
      res.json({
        success: true,
        chatId: actualChatId,
        aiResponse: aiContent,
        timestamp: new Date().toISOString()
      });
      
    } catch (aiError) {
      console.error('DeepSeek API调用失败:', aiError);
      
      // AI服务不可用时的降级响应
      const fallbackResponse = `抱歉，AI服务暂时不可用。请稍后重试。

如果您有紧急医疗问题，请立即联系：
- 急救电话：120
- 医院急诊科
- 您的主治医生

对于一般健康咨询，建议您：
1. 详细记录症状和时间
2. 预约专科医生
3. 准备相关检查报告`;
      
      // 仍然保存对话记录，使用降级响应
      let actualChatId = chatId;
      if (!chatId) {
        const chatTitle = message.length > 20 ? message.substring(0, 20) + '...' : message;
        const [chatResult] = await pool.execute(
          'INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
          [decoded.userId, chatTitle]
        );
        actualChatId = chatResult.insertId;
      }
      
      await pool.execute(
        `INSERT INTO chat_messages (chat_session_id, message_type, content, created_at) 
         VALUES (?, 'user', ?, NOW())`,
        [actualChatId, message.trim()]
      );
      
      await pool.execute(
        `INSERT INTO chat_messages (chat_session_id, message_type, content, created_at) 
         VALUES (?, 'ai', ?, NOW())`,
        [actualChatId, fallbackResponse]
      );
      
      res.json({
        success: true,
        chatId: actualChatId,
        aiResponse: fallbackResponse,
        timestamp: new Date().toISOString(),
        fallback: true
      });
    }
    
  } catch (error) {
    console.error('AI聊天API失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '聊天服务异常',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 获取聊天历史列表API
app.get('/api/chat/sessions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('=== 获取聊天历史API调试信息 ===');
    console.log('用户ID:', decoded.userId);
    
    const [sessions] = await pool.execute(
      `SELECT id, title, created_at, updated_at 
       FROM chat_sessions 
       WHERE user_id = ? 
       ORDER BY updated_at DESC 
       LIMIT 50`,
      [decoded.userId]
    );
    
    console.log('查询到的聊天会话数量:', sessions.length);
    
    // 格式化时间
    const formattedSessions = sessions.map(session => ({
      ...session,
      created_at: session.created_at,
      updated_at: session.updated_at,
      timeDisplay: formatChatTime(session.updated_at)
    }));
    
    res.json({ 
      success: true, 
      sessions: formattedSessions 
    });
    
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取聊天历史失败' 
    });
  }
});

// 获取具体聊天会话的消息API
app.get('/api/chat/sessions/:chatId/messages', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const chatId = req.params.chatId;
    
    console.log('=== 获取聊天消息API调试信息 ===');
    console.log('用户ID:', decoded.userId);
    console.log('聊天ID:', chatId);
    
    // 验证聊天会话所有权
    const [sessions] = await pool.execute(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [chatId, decoded.userId]
    );
    
    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: '聊天会话不存在' });
    }
    
    // 获取消息
    const [messages] = await pool.execute(
      `SELECT id, message_type, content, created_at 
       FROM chat_messages 
       WHERE chat_session_id = ? 
       ORDER BY created_at ASC`,
      [chatId]
    );
    
    console.log('查询到的消息数量:', messages.length);
    
    // 格式化消息
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      type: msg.message_type,
      content: msg.content,
      timestamp: msg.created_at,
      timeDisplay: formatMessageTime(msg.created_at)
    }));
    
    res.json({ 
      success: true, 
      messages: formattedMessages 
    });
    
  } catch (error) {
    console.error('获取聊天消息失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取聊天消息失败' 
    });
  }
});

// 删除聊天会话API
app.delete('/api/chat/sessions/:chatId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const chatId = req.params.chatId;
    
    console.log('=== 删除聊天会话API调试信息 ===');
    console.log('用户ID:', decoded.userId);
    console.log('聊天ID:', chatId);
    
    // 开启事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // 先删除消息
      await connection.execute(
        'DELETE FROM chat_messages WHERE chat_session_id = ?',
        [chatId]
      );
      
      // 再删除会话（验证所有权）
      const [result] = await connection.execute(
        'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
        [chatId, decoded.userId]
      );
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: '聊天会话不存在或无权限删除' });
      }
      
      await connection.commit();
      console.log('聊天会话删除成功');
      
      res.json({ success: true, message: '删除成功' });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('删除聊天会话失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '删除失败' 
    });
  }
});

// 工具函数：格式化聊天时间
function formatChatTime(timeString) {
  try {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) {
      return '刚刚';
    } else if (diffMins < 60) {
      return `${diffMins}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  } catch (error) {
    return '时间错误';
  }
}

// 工具函数：格式化消息时间
function formatMessageTime(timeString) {
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '时间错误';
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
