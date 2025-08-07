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
    wx.request({
      url: `${baseUrl}/cases/${caseId}`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          const caseData = res.data.caseData;
          // 格式化时间显示
          caseData.createTime = this.formatTime(caseData.created_at);
          this.setData({
            caseData: caseData
          });
        } else {
          wx.showToast({
            title: res.data.message || '病例不存在',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      },
      fail: (err) => {
        console.error('加载病例详情失败:', err);
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