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
    wx.request({
      url: `${baseUrl}/cases`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          // 格式化时间显示
          const formattedCases = res.data.cases.map(caseItem => ({
            ...caseItem,
            createTime: this.formatTime(caseItem.created_at)
          }));

          this.setData({
            cases: formattedCases
          });
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('加载病例数据失败:', err);
        wx.hideLoading();
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
    if (!token) {
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
    wx.request({
      url: `${baseUrl}/cases/${caseId}`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 重新加载病例列表
          this.loadCases();
        } else {
          wx.showToast({
            title: res.data.message || '删除失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('删除病例失败:', err);
        wx.hideLoading();
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

  // 导航到导入页面
  navigateToImport() {
    wx.navigateTo({
      url: '/pages/case-import/case-import'
    });
  }
}); 