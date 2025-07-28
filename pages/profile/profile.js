// profile.js
Page({
  data: {
    userInfo: null,
    hasUserInfo: false
  },

  onLoad() {
    this.checkUserLoginStatus();
  },

  onShow() {
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
    } else {
      // 初始化空的用户信息
      this.setData({
        userInfo: {
          name: '',
          gender: '',
          age: '',
          phone: ''
        },
        hasUserInfo: false
      });
    }
  },

  // 微信登录
  login() {
    wx.showLoading({
      title: '登录中...'
    });

    // 获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        // 创建用户信息对象，不获取手机号
        const userInfo = {
          ...res.userInfo,
          phone: '微信用户', // 默认手机号显示
          name: '', // 重置姓名，让用户手动填写
          gender: '', // 重置性别，让用户手动选择
          age: '' // 重置年龄，让用户手动填写
        };
        
        wx.setStorageSync('userInfo', userInfo);
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
        
        wx.hideLoading();
        wx.showToast({
          title: '登录成功，请完善个人信息',
          icon: 'success',
          duration: 2000
        });
      },
      fail: (err) => {
        console.error('登录失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '登录失败',
          icon: 'error'
        });
      }
    });
  },

  // 导航到个人资料编辑页面
  navigateToProfileEdit() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    });
  },

  // 导航到病例列表
  navigateToCaseList() {
    wx.navigateTo({
      url: '/pages/case-list/case-list'
    });
  },

  // 清除数据
  clearData() {
    wx.showModal({
      title: '确认清除',
      content: '这将清除所有本地数据，包括病例信息和用户信息',
      confirmText: '确认清除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({
            userInfo: {
              name: '',
              gender: '',
              age: '',
              phone: ''
            },
            hasUserInfo: false
          });
          wx.showToast({
            title: '数据已清除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 关于我们
  about() {
    wx.showModal({
      title: '关于我们',
      content: '医疗助手 v1.0.0\n\n为患者提供便捷的病例管理服务',
      showCancel: false,
      confirmText: '知道了'
    });
  }
}); 