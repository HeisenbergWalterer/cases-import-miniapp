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
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      const genderIndex = userInfo.gender === '男' ? 1 : userInfo.gender === '女' ? 2 : 0;
      this.setData({
        userInfo: userInfo,
        genderIndex: genderIndex
      });
    }
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
        'Content-Type': 'application/json'
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