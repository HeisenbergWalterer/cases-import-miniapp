// profile-edit.js
Page({
  data: {
    userInfo: {
      name: '',
      gender: '',
      age: '',
      phone: ''
    },
    genderOptions: ['请选择', '男', '女'],
    genderIndex: 0
  },

  onLoad() {
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo() {
    const token = wx.getStorageSync('token');
    if (token) {
      // 如果有token，从后端获取最新的用户信息
      this.fetchUserProfile();
    } else {
      // 没有token时，使用本地存储的信息
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        const genderIndex = userInfo.gender === '男' ? 1 : userInfo.gender === '女' ? 2 : 0;
        this.setData({
          userInfo: userInfo,
          genderIndex: genderIndex
        });
      }
    }
  },

  // 从后端获取用户完整信息
  fetchUserProfile() {
    const token = wx.getStorageSync('token');
    console.log('获取到的token:', token ? '存在token' : '无token');
    if (!token) {
      console.error('没有token，无法获取用户信息');
      return;
    }

    const baseUrl = getApp().globalData.baseUrl;
    const url = `${baseUrl}/user/profile`;
    console.log('请求URL:', url);
    console.log('请求头Authorization:', `Bearer ${token.substring(0, 10)}...`);
    
    wx.request({
      url: url,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('获取用户信息API响应:', res);
        console.log('响应状态码:', res.statusCode);
        console.log('响应数据类型:', typeof res.data);
        console.log('响应数据:', res.data);
        
        // 检查是否收到HTML页面（ngrok拦截页面）
        if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
          console.error('收到HTML页面，可能是ngrok拦截，使用本地存储数据');
          const localUserInfo = wx.getStorageSync('userInfo');
          console.log('HTML响应-使用本地存储的用户信息:', localUserInfo);
          if (localUserInfo) {
            const genderIndex = localUserInfo.gender === '男' ? 1 : localUserInfo.gender === '女' ? 2 : 0;
            this.setData({
              userInfo: localUserInfo,
              genderIndex: genderIndex
            });
          }
          return;
        }
        
        if (res.statusCode === 200 && res.data && res.data.success) {
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
          
          const genderIndex = processedUserInfo.gender === '男' ? 1 : processedUserInfo.gender === '女' ? 2 : 0;
          this.setData({
            userInfo: processedUserInfo,
            genderIndex: genderIndex
          });
          // 同时更新本地存储
          wx.setStorageSync('userInfo', processedUserInfo);
        } else {
          console.error('获取用户信息失败');
          console.error('响应状态码:', res.statusCode);
          console.error('响应数据:', res.data);
          console.error('错误信息:', res.data?.message || '未知错误');
          
          // 如果获取失败，使用本地存储的信息
          const localUserInfo = wx.getStorageSync('userInfo');
          console.log('使用本地存储的用户信息:', localUserInfo);
          if (localUserInfo) {
            const genderIndex = localUserInfo.gender === '男' ? 1 : localUserInfo.gender === '女' ? 2 : 0;
            this.setData({
              userInfo: localUserInfo,
              genderIndex: genderIndex
            });
          }
        }
      },
      fail: (err) => {
        console.error('获取用户信息网络错误:', err);
        console.error('错误详情:', JSON.stringify(err));
        
        // 网络错误时，使用本地存储的信息
        const localUserInfo = wx.getStorageSync('userInfo');
        console.log('网络错误-使用本地存储的用户信息:', localUserInfo);
        if (localUserInfo) {
          const genderIndex = localUserInfo.gender === '男' ? 1 : localUserInfo.gender === '女' ? 2 : 0;
          this.setData({
            userInfo: localUserInfo,
            genderIndex: genderIndex
          });
        }
      }
    });
  },

  // 姓名输入
  onNameInput(e) {
    this.setData({
      'userInfo.name': e.detail.value
    });
  },

  // 性别选择
  onGenderChange(e) {
    const index = e.detail.value;
    this.setData({
      genderIndex: index,
      'userInfo.gender': this.data.genderOptions[index]
    });
  },

  // 年龄输入
  onAgeInput(e) {
    this.setData({
      'userInfo.age': e.detail.value
    });
  },

  // 保存个人信息
  saveProfile() {
    const userInfo = this.data.userInfo;
    
    if (!userInfo.name) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }

    if (this.data.genderIndex === 0) {
      wx.showToast({
        title: '请选择性别',
        icon: 'none'
      });
      return;
    }

    if (!userInfo.age) {
      wx.showToast({
        title: '请输入年龄',
        icon: 'none'
      });
      return;
    }

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...'
    });

    const baseUrl = getApp().globalData.baseUrl;
    wx.request({
      url: `${baseUrl}/user/profile`,
      method: 'PUT',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      data: {
        name: userInfo.name,
        gender: userInfo.gender,
        age: userInfo.age,
        phone: userInfo.phone || ''
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          // 同时更新本地存储
          wx.setStorageSync('userInfo', userInfo);
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 2000);
            }
          });
        } else {
          wx.showToast({
            title: res.data.message || '保存失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('保存失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  }
}); 