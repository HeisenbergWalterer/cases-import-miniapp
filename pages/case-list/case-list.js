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
    try {
      const cases = wx.getStorageSync('medicalCases') || [];
      
      // 过滤掉无效的病例数据
      const validCases = cases.filter(caseItem => 
        caseItem && 
        caseItem.id && 
        caseItem.patientName && 
        caseItem.createTime
      );
      
      // 按创建时间倒序排列
      validCases.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
      
      // 格式化时间显示
      const formattedCases = validCases.map(caseItem => ({
        ...caseItem,
        createTime: this.formatTime(caseItem.createTime)
      }));

      this.setData({
        cases: formattedCases
      });
    } catch (error) {
      console.error('加载病例数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'error'
      });
    }
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
    try {
      let cases = wx.getStorageSync('medicalCases') || [];
      cases = cases.filter(caseItem => caseItem.id !== caseId);
      wx.setStorageSync('medicalCases', cases);
      
      this.loadCases();
      
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('删除病例失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  },

  // 导航到导入页面
  navigateToImport() {
    wx.navigateTo({
      url: '/pages/case-import/case-import'
    });
  }
}); 