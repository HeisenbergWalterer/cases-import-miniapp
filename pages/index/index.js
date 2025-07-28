// index.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false
  },

  onLoad() {
    // 检查用户登录状态
    this.checkUserLoginStatus();
  },

  onShow() {
    // 检查用户登录状态
    this.checkUserLoginStatus();
  },

  // 检查用户登录状态
  checkUserLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      });
    }
  },

  // 导航到病例导入页面
  navigateToCaseImport() {
    // 检查用户是否已登录并完善个人信息
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.name || !userInfo.gender || !userInfo.age) {
      wx.showModal({
        title: '提示',
        content: '请先在个人中心完善您的个人信息（姓名、性别、年龄）',
        confirmText: '去完善',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/case-import/case-import'
    });
  },

  // 导航到AI病情分析页面
  navigateToAIAnalysis() {
    wx.switchTab({
      url: '/pages/chat/chat'
    });
  },

  // 导航到病例列表页面
  navigateToCaseList() {
    wx.navigateTo({
      url: '/pages/case-list/case-list'
    });
  }
});
