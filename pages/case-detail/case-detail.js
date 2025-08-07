// case-detail.js
Page({
  data: {
    caseData: null
  },

  onLoad(options) {
    const caseId = options.id;
    if (!caseId) {
      wx.showToast({
        title: '病例ID无效',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.loadCaseDetail(caseId);
  },

  // 加载病例详情
  loadCaseDetail(caseId) {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    wx.showLoading({
      title: '加载中...'
    });

    const baseUrl = getApp().globalData.baseUrl;
    const requestUrl = `${baseUrl}/cases/${caseId}`;
    
    console.log('=== 病例详情加载调试信息 ===');
    console.log('病例ID:', caseId);
    console.log('请求URL:', requestUrl);
    console.log('Token存在:', !!token);
    
    wx.request({
      url: requestUrl,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('病例详情API响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据:', res.data);
        
        wx.hideLoading();
        
        // 检查是否收到HTML页面（ngrok拦截页面）
        if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
          console.error('收到HTML页面，可能是ngrok拦截');
          wx.showToast({
            title: 'API访问被拦截',
            icon: 'error'
          });
          return;
        }
        
                    if (res.statusCode === 200 && res.data && res.data.success) {
              const caseData = res.data.caseData;
              
              console.log('=== 前端收到数据 ===');
              console.log('完整数据:', caseData);
              console.log('合并疾病:', caseData.comorbidities, '长度:', caseData.comorbidities?.length);
              console.log('既往病史:', caseData.past_history, '长度:', caseData.past_history?.length);
              console.log('B超报告内容:', caseData.ultrasound_report);
              console.log('B超报告类型:', typeof caseData.ultrasound_report);
              console.log('B超报告长度:', caseData.ultrasound_report?.length || 0);
              console.log('病理报告内容:', caseData.pathology_report);
              console.log('病理报告类型:', typeof caseData.pathology_report);
              console.log('病理报告长度:', caseData.pathology_report?.length || 0);
              
              // 测试条件判断
              console.log('B超报告条件判断1 - 存在:', !!caseData.ultrasound_report);
              console.log('B超报告条件判断2 - 可以trim:', caseData.ultrasound_report && typeof caseData.ultrasound_report.trim === 'function');
              console.log('B超报告条件判断3 - trim后非空:', caseData.ultrasound_report && caseData.ultrasound_report.trim && caseData.ultrasound_report.trim().length > 0);
              console.log('病理报告条件判断1 - 存在:', !!caseData.pathology_report);
              console.log('病理报告条件判断2 - 可以trim:', caseData.pathology_report && typeof caseData.pathology_report.trim === 'function');
              console.log('病理报告条件判断3 - trim后非空:', caseData.pathology_report && caseData.pathology_report.trim && caseData.pathology_report.trim().length > 0);
              
              // 格式化时间显示
              caseData.createTime = this.formatTime(caseData.created_at);
              
              // 直接设置数据，信任后端已经处理好的数据
              this.setData({
                caseData: caseData
              });
              
              console.log('=== 前端数据设置完成 ===');
            } else {
          console.error('病例详情API返回失败:', res.data);
          wx.showToast({
            title: res.data?.message || '病例不存在',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: (err) => {
        console.error('加载病例详情失败:', err);
        console.error('错误详情:', JSON.stringify(err));
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      },
      complete: () => {
        // 确保hideLoading被调用
        wx.hideLoading();
        console.log('=== 病例详情调试信息结束 ===');
      }
    });
  },

  // 格式化时间
  formatTime(timeString) {
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        return '时间格式错误';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('时间格式化失败:', error);
      return '时间格式错误';
    }
  },

  // 编辑病例
  editCase() {
    wx.showModal({
      title: '提示',
      content: '编辑功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    });
  }
}); 