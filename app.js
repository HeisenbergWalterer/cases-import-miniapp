// app.js
App({
  onLaunch() {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      console.log('用户未登录');
    }
  },
  
  globalData: {
    userInfo: null,
    baseUrl: 'https://ef4f4e7e4c32.ngrok-free.app/api'  // 您的ngrok域名
  }
})
