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
  }
}); 