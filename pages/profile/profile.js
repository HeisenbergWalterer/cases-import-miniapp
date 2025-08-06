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

    // 直接获取用户信息（必须在用户点击时调用）
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        // 获取用户信息成功后，再获取登录code
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 调用后端API进行登录
              this.callLoginAPI(loginRes.code, userRes.userInfo);
            } else {
              wx.hideLoading();
              wx.showToast({
                title: '微信登录失败',
                icon: 'error'
              });
            }
          },
          fail: (err) => {
            console.error('微信登录失败:', err);
            wx.hideLoading();
            wx.showToast({
              title: '微信登录失败',
              icon: 'error'
            });
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'error'
        });
      }
    });
  },

  // 调用登录API
  callLoginAPI(loginCode, userInfo) {
    const baseUrl = getApp().globalData.baseUrl;
    wx.request({
      url: `${baseUrl}/user/login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        code: loginCode,
        userInfo: userInfo
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          // 保存token和用户信息
          wx.setStorageSync('token', res.data.token);
          wx.setStorageSync('userInfo', res.data.userInfo);
          
          this.setData({
            userInfo: res.data.userInfo,
            hasUserInfo: true
          });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: res.data.message || '登录失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('登录失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
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