const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

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
const WECHAT_SECRET = '23780aa189a8a5140b28e39265d5cb00';

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
      console.log('删除病例失败: 缺少token');
      return res.status(401).json({ success: false, message: '未授权' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const caseId = req.params.id;
    
    console.log('=== 删除病例API调试信息 ===');
    console.log('病例ID:', caseId);
    console.log('用户ID:', decoded.userId);
    
    const [result] = await pool.execute(
      'DELETE FROM cases WHERE id = ? AND user_id = ?',
      [caseId, decoded.userId]
    );
    
    console.log('删除操作结果:', {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows
    });
    
    if (result.affectedRows === 0) {
      console.log('删除失败: 病例不存在或无权限');
      return res.status(404).json({ success: false, message: '病例不存在或无权限删除' });
    }
    
    console.log('病例删除成功');
    console.log('=== 删除病例调试信息结束 ===\n');
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除病例失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
