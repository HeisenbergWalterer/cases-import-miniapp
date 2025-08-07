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
    const token = wx.getStorageSync('token');
    
    if (userInfo && token) {
      // 如果已登录，从后端获取最新的完整用户信息
      this.fetchUserProfile();
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

  // 从后端获取用户完整信息
  fetchUserProfile() {
    const token = wx.getStorageSync('token');
    console.log('个人资料页面-获取到的token:', token ? '存在token' : '无token');
    if (!token) {
      console.error('个人资料页面-没有token，无法获取用户信息');
      return;
    }

    const baseUrl = getApp().globalData.baseUrl;
    const url = `${baseUrl}/user/profile`;
    console.log('个人资料页面-请求URL:', url);
    console.log('个人资料页面-请求头Authorization:', `Bearer ${token.substring(0, 10)}...`);
    
    wx.request({
      url: url,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('个人资料页面-获取用户信息API响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据类型:', typeof res.data);
        console.log('响应数据:', res.data);
        
        // 检查是否收到HTML页面（ngrok拦截页面）
        if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
          console.error('个人资料页面-收到HTML页面，可能是ngrok拦截，使用本地存储数据');
          const localUserInfo = wx.getStorageSync('userInfo');
          console.log('个人资料页面-HTML响应-使用本地存储的用户信息:', localUserInfo);
          if (localUserInfo) {
            this.setData({
              userInfo: localUserInfo,
              hasUserInfo: true
            });
          }
          return;
        }
        
        if (res.statusCode === 200 && res.data && res.data.success) {
          // 更新页面数据和本地存储
          const userInfo = res.data.userInfo;
          console.log('获取到的用户信息:', userInfo);
          
          // 处理null值，转换为空字符串或默认值
          const processedUserInfo = {
            ...userInfo,
            name: userInfo.name || '',
            gender: userInfo.gender || '',
            age: userInfo.age || '',
            phone: userInfo.phone || ''
          };
          
          this.setData({
            userInfo: processedUserInfo,
            hasUserInfo: true
          });
          // 同时更新本地存储，保持数据同步
          wx.setStorageSync('userInfo', processedUserInfo);
        } else {
          console.error('个人资料页面-获取用户信息失败');
          console.error('响应状态码:', res.statusCode);
          console.error('响应数据:', res.data);
          console.error('错误信息:', res.data?.message || '未知错误');
          
          // 如果获取失败，仍然使用本地存储的基本信息
          const localUserInfo = wx.getStorageSync('userInfo');
          console.log('使用本地存储的用户信息:', localUserInfo);
          if (localUserInfo) {
            this.setData({
              userInfo: localUserInfo,
              hasUserInfo: true
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取用户信息网络错误:', err);
        // 网络错误时，使用本地存储的信息
        const localUserInfo = wx.getStorageSync('userInfo');
        if (localUserInfo) {
          this.setData({
            userInfo: localUserInfo,
            hasUserInfo: true
          });
        }
      }
    });
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
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
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