// case-list.js
Page({
  data: {
    cases: []
  },

  onLoad() {
    this.loadCases();
  },

  onShow() {
    this.loadCases();
  },

  // 加载病例数据
  loadCases() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    console.log('=== 病例列表加载调试信息 ===');
    console.log('Token存在:', !!token);
    console.log('Token内容:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('用户信息:', userInfo);
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '加载中...'
    });

    const baseUrl = getApp().globalData.baseUrl;
    console.log('请求URL:', `${baseUrl}/cases`);
    
    wx.request({
      url: `${baseUrl}/cases`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('获取病例列表API响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据:', res.data);
        
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
          // 检查是否有病例数据
          if (!res.data.cases || !Array.isArray(res.data.cases)) {
            console.warn('病例数据格式异常:', res.data.cases);
            this.setData({
              cases: []
            });
            return;
          }
          
          // 格式化时间显示
          const formattedCases = res.data.cases.map(caseItem => ({
            ...caseItem,
            createTime: this.formatTime(caseItem.created_at)
          }));

          this.setData({
            cases: formattedCases
          });
          
          console.log('病例列表加载成功，共', formattedCases.length, '个病例');
          
          if (formattedCases.length === 0) {
            console.log('提示：当前没有病例数据');
          }
        } else {
          console.error('API返回失败:', res.data);
          wx.showToast({
            title: res.data?.message || '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('加载病例数据失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      },
      complete: () => {
        // 确保hideLoading被调用
        wx.hideLoading();
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

  // 查看病例详情
  viewCaseDetail(e) {
    const caseId = e.currentTarget.dataset.id;
    if (!caseId) {
      wx.showToast({
        title: '病例ID无效',
        icon: 'error'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/case-detail/case-detail?id=${caseId}`
    });
  },

  // 编辑病例
  editCase(e) {
    const caseId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '编辑功能正在开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 删除病例
  deleteCase(e) {
    const caseId = e.currentTarget.dataset.id;
    
    if (!caseId) {
      wx.showToast({
        title: '病例ID无效',
        icon: 'error'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个病例吗？',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          this.deleteCaseById(caseId);
        }
      }
    });
  },

  // 根据ID删除病例
  deleteCaseById(caseId) {
    const token = wx.getStorageSync('token');
    console.log('=== 删除病例前端调试信息 ===');
    console.log('要删除的病例ID:', caseId);
    console.log('Token存在:', !!token);
    
    if (!token) {
      console.error('删除失败: 没有token');
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '删除中...'
    });

    const baseUrl = getApp().globalData.baseUrl;
    const requestUrl = `${baseUrl}/cases/${caseId}`;
    console.log('删除请求URL:', requestUrl);
    
    wx.request({
      url: requestUrl,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('删除API响应:', res);
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
          console.log('删除成功');
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 重新加载病例列表
          this.loadCases();
        } else {
          console.error('删除失败:', res.data);
          wx.showToast({
            title: res.data?.message || '删除失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('删除病例网络错误:', err);
        console.error('错误详情:', JSON.stringify(err));
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      },
      complete: () => {
        // 确保hideLoading被调用
        wx.hideLoading();
        console.log('=== 删除病例调试信息结束 ===');
      }
    });
  },

  // 导航到导入页面
  navigateToImport() {
    wx.navigateTo({
      url: '/pages/case-import/case-import'
    });
  }
}); 