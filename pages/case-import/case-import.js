// case-import.js
Page({
  data: {
    currentStep: 1,
    totalSteps: 5, // 减少为5步，跳过基本信息
    progress: 20, // 调整进度条初始值
    formData: {
      patientName: '',
      gender: '',
      age: '',
      hospitalId: '',
      pathologyId: '',
      symptomDuration: '',
      durationUnit: '',
      comorbidities: [],
      pastHistory: [],
      ultrasoundReport: '',
      ultrasoundPhotos: [],
      pathologyReport: '',
      pathologyPhotos: []
    },
    durationOptions: ['请选择', '天', '周', '月', '年'],
    durationIndex: 0,
    comorbidityOptions: [
      { label: '高血压', value: '高血压', checked: false },
      { label: '糖尿病', value: '糖尿病', checked: false },
      { label: '冠心病/心梗', value: '冠心病/心梗', checked: false },
      { label: '脑梗/脑出血', value: '脑梗/脑出血', checked: false },
      { label: '慢性支气管炎', value: '慢性支气管炎', checked: false },
      { label: '肝功能不全', value: '肝功能不全', checked: false },
      { label: '肾功能不全', value: '肾功能不全', checked: false },
      { label: '恶性肿瘤病史', value: '恶性肿瘤病史', checked: false },
      { label: '免疫缺陷疾病', value: '免疫缺陷疾病', checked: false }
    ],
    pastHistoryOptions: [
      { label: '胆囊炎急性发作病史', value: '胆囊炎急性发作病史', checked: false },
      { label: '黄疸', value: '黄疸', checked: false },
      { label: '胆总管结石', value: '胆总管结石', checked: false },
      { label: '胰腺炎', value: '胰腺炎', checked: false }
    ]
  },

  onLoad() {
    // 页面加载时初始化数据
    this.initFormData();
  },

  // 初始化表单数据
  initFormData() {
    // 重置所有选项状态
    const comorbidityOptions = this.data.comorbidityOptions.map(item => ({
      ...item,
      checked: false
    }));
    
    const pastHistoryOptions = this.data.pastHistoryOptions.map(item => ({
      ...item,
      checked: false
    }));

    // 从用户个人信息中获取基本信息
    const userInfo = wx.getStorageSync('userInfo');
    const basicInfo = {
      patientName: userInfo ? userInfo.name : '',
      gender: userInfo ? userInfo.gender : '',
      age: userInfo ? userInfo.age : ''
    };

    this.setData({
      comorbidityOptions: comorbidityOptions,
      pastHistoryOptions: pastHistoryOptions,
      formData: {
        ...basicInfo,
        hospitalId: '',
        pathologyId: '',
        symptomDuration: '',
        durationUnit: '',
        comorbidities: [],
        pastHistory: [],
        ultrasoundReport: '',
        ultrasoundPhotos: [],
        pathologyReport: '',
        pathologyPhotos: []
      },
      durationIndex: 0,
      currentStep: 1,
      progress: 20
    });
  },

  // 输入框变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    
    // 更新数据
    this.setData({
      [`formData.${field}`]: value
    });
    
    // 如果是报告内容字段，触发自适应调整
    if (field === 'ultrasoundReport' || field === 'pathologyReport') {
      this.adjustTextareaHeight(e);
    }
  },

  // 调整文本框高度
  adjustTextareaHeight(e) {
    const query = wx.createSelectorQuery();
    query.select(`textarea[data-field="${e.currentTarget.dataset.field}"]`).boundingClientRect();
    query.exec((res) => {
      if (res[0]) {
        // 计算内容高度并调整
        const contentHeight = this.calculateContentHeight(e.detail.value);
        const minHeight = 160; // 最小高度
        const maxHeight = 800; // 最大高度
        const targetHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));
        
        // 这里可以通过CSS变量或其他方式调整高度
        // 由于微信小程序的限制，主要通过auto-height属性实现
      }
    });
  },

  // 计算内容高度
  calculateContentHeight(text) {
    if (!text) return 160;
    
    // 简单的行数计算
    const lines = text.split('\n').length;
    const charsPerLine = 20; // 估算每行字符数
    const estimatedLines = Math.ceil(text.length / charsPerLine);
    const totalLines = Math.max(lines, estimatedLines);
    
    // 每行高度约40rpx
    return totalLines * 40 + 80; // 基础高度80rpx
  },

  // 触发文本框高度调整
  triggerTextareaResize(field) {
    // 使用nextTick确保DOM更新完成后再调整
    wx.nextTick(() => {
      const query = wx.createSelectorQuery();
      query.select(`textarea[data-field="${field}"]`).boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          // 文本框会自动根据auto-height属性调整高度
          console.log(`${field} 文本框高度已调整`);
        }
      });
    });
  },

  // 时间单位选择
  onDurationChange(e) {
    const index = e.detail.value;
    this.setData({
      durationIndex: index,
      'formData.durationUnit': this.data.durationOptions[index]
    });
  },

  // 合并疾病点击处理
  onComorbidityTap(e) {
    const value = e.currentTarget.dataset.value;
    
    // 更新选项状态
    const comorbidityOptions = this.data.comorbidityOptions.map(item => {
      if (item.value === value) {
        item.checked = !item.checked;
      }
      return item;
    });

    // 更新选中的疾病列表
    let comorbidities = this.data.formData.comorbidities;
    const targetOption = comorbidityOptions.find(item => item.value === value);
    
    if (targetOption.checked) {
      if (!comorbidities.includes(value)) {
        comorbidities.push(value);
      }
    } else {
      comorbidities = comorbidities.filter(item => item !== value);
    }

    this.setData({
      comorbidityOptions: comorbidityOptions,
      'formData.comorbidities': comorbidities
    });
  },

  // 既往病史点击处理
  onPastHistoryTap(e) {
    const value = e.currentTarget.dataset.value;
    
    // 更新选项状态
    const pastHistoryOptions = this.data.pastHistoryOptions.map(item => {
      if (item.value === value) {
        item.checked = !item.checked;
      }
      return item;
    });

    // 更新选中的病史列表
    let pastHistory = this.data.formData.pastHistory;
    const targetOption = pastHistoryOptions.find(item => item.value === value);
    
    if (targetOption.checked) {
      if (!pastHistory.includes(value)) {
        pastHistory.push(value);
      }
    } else {
      pastHistory = pastHistory.filter(item => item !== value);
    }

    this.setData({
      pastHistoryOptions: pastHistoryOptions,
      'formData.pastHistory': pastHistory
    });
  },

  // 下一步
  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }

    const nextStep = this.data.currentStep + 1;
    const progress = (nextStep / this.data.totalSteps) * 100;
    
    this.setData({
      currentStep: nextStep,
      progress: progress
    });
  },

  // 上一步
  prevStep() {
    const prevStep = this.data.currentStep - 1;
    const progress = (prevStep / this.data.totalSteps) * 100;
    
    this.setData({
      currentStep: prevStep,
      progress: progress
    });
  },

  // 验证当前步骤
  validateCurrentStep() {
    const currentStep = this.data.currentStep;
    const formData = this.data.formData;

    switch (currentStep) {
      case 1: // 现在是症状信息（原来的第二步）
        if (!formData.symptomDuration) {
          wx.showToast({
            title: '请输入症状出现时间',
            icon: 'none'
          });
          return false;
        }
        if (this.data.durationIndex === 0) {
          wx.showToast({
            title: '请选择时间单位',
            icon: 'none'
          });
          return false;
        }
        break;
      case 2: // 合并疾病（原来的第三步）
        // 合并疾病是可选的，不需要验证
        break;
      case 3: // 既往病史（原来的第四步）
        // 既往病史是可选的，不需要验证
        break;
      case 4: // 影像学报告（原来的第五步）
        // 影像学报告是可选的，不需要验证
        break;
      case 5: // 病理报告（原来的第六步）
        // 病理报告是可选的，不需要验证
        break;
    }

    return true;
  },

  // 提交表单
  submitForm() {
    if (!this.validateCurrentStep()) {
      return;
    }

    // 检查基本信息是否完整
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

    wx.showLoading({
      title: '保存中...'
    });

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.hideLoading();
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    // 构建完整的病例数据
    const caseData = {
      ...this.data.formData,
      // 确保基本信息来自用户个人信息
      patientName: userInfo.name,
      gender: userInfo.gender,
      age: userInfo.age
    };

    const baseUrl = getApp().globalData.baseUrl;
    wx.request({
      url: `${baseUrl}/cases`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: caseData,
      success: (res) => {
        wx.hideLoading();
        if (res.data.success) {
          wx.showToast({
            title: '病例导入成功',
            icon: 'success',
            duration: 2000,
            success: () => {
              setTimeout(() => {
                wx.navigateTo({
                  url: '/pages/case-list/case-list'
                });
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
  },

  // 选择影像学报告照片
  chooseUltrasoundPhoto() {
    const remainingCount = 6 - this.data.formData.ultrasoundPhotos.length;
    
    wx.chooseImage({
      count: remainingCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        const currentPhotos = this.data.formData.ultrasoundPhotos;
        const newPhotos = [...currentPhotos, ...tempFilePaths];
        
        this.setData({
          'formData.ultrasoundPhotos': newPhotos
        });
        
        wx.showToast({
          title: '照片添加成功',
          icon: 'success',
          duration: 1500
        });

        // 对新添加的照片进行OCR文字识别
        tempFilePaths.forEach((filePath, index) => {
          this.performOCR(filePath, 'ultrasound');
        });
      },
      fail: () => {
        wx.showToast({
          title: '取消选择照片',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  // 选择病理报告照片
  choosePathologyPhoto() {
    const remainingCount = 6 - this.data.formData.pathologyPhotos.length;
    
    wx.chooseImage({
      count: remainingCount,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        const currentPhotos = this.data.formData.pathologyPhotos;
        const newPhotos = [...currentPhotos, ...tempFilePaths];
        
        this.setData({
          'formData.pathologyPhotos': newPhotos
        });
        
        wx.showToast({
          title: '照片添加成功',
          icon: 'success',
          duration: 1500
        });

        // 对新添加的照片进行OCR文字识别
        tempFilePaths.forEach((filePath, index) => {
          this.performOCR(filePath, 'pathology');
        });
      },
      fail: () => {
        wx.showToast({
          title: '取消选择照片',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },

  // 删除影像学报告照片
  deleteUltrasoundPhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.formData.ultrasoundPhotos;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          photos.splice(index, 1);
          this.setData({
            'formData.ultrasoundPhotos': photos
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 删除病理报告照片
  deletePathologyPhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = this.data.formData.pathologyPhotos;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          photos.splice(index, 1);
          this.setData({
            'formData.pathologyPhotos': photos
          });
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 预览照片
  previewPhoto(e) {
    const current = e.currentTarget.dataset.current;
    const urls = e.currentTarget.dataset.urls;
    
    wx.previewImage({
      current: current,
      urls: urls
    });
  },

  // OCR文字识别功能
  performOCR(imagePath, type) {
    // 显示加载提示
    wx.showLoading({
      title: '正在识别文字...',
      mask: true
    });

    // 上传图片到OCR服务
    wx.uploadFile({
      url: 'http://10.91.11.250:5000/ocr', // OCR API服务地址
      filePath: imagePath,
      name: 'file',
      success: (res) => {
        wx.hideLoading();
        
        console.log('OCR原始响应:', res);
        console.log('OCR响应数据:', res.data);
        console.log('OCR状态码:', res.statusCode);
        
        try {
          // 检查HTTP状态码
          if (res.statusCode !== 200) {
            throw new Error(`HTTP错误: ${res.statusCode}`);
          }
          
          const result = JSON.parse(res.data);
          console.log('OCR解析结果:', result);
          
          if (result && result.success) {
            if (result.document_text) {
              const extractedText = result.document_text;
              console.log('OCR识别文字:', extractedText);
              
                          // 根据类型填充到对应的文本框
            if (type === 'ultrasound') {
              // 追加到影像学报告内容
              const currentText = this.data.formData.ultrasoundReport;
              const newText = currentText ? `${currentText}\n\n${extractedText}` : extractedText;
              this.setData({
                'formData.ultrasoundReport': newText
              }, () => {
                // 触发文本框高度调整
                this.triggerTextareaResize('ultrasoundReport');
              });
            } else if (type === 'pathology') {
              // 追加到病理报告内容
              const currentText = this.data.formData.pathologyReport;
              const newText = currentText ? `${currentText}\n\n${extractedText}` : extractedText;
              this.setData({
                'formData.pathologyReport': newText
              }, () => {
                // 触发文本框高度调整
                this.triggerTextareaResize('pathologyReport');
              });
            }
              
              wx.showToast({
                title: '文字识别成功',
                icon: 'success',
                duration: 2000
              });
            } else {
              console.warn('OCR识别结果为空');
              wx.showToast({
                title: '图片中未检测到文字',
                icon: 'none',
                duration: 3000
              });
            }
          } else {
            console.error('OCR服务返回失败:', result);
            wx.showToast({
              title: result.error || 'OCR服务处理失败',
              icon: 'none',
              duration: 3000
            });
          }
        } catch (error) {
          console.error('OCR解析错误:', error);
          console.error('原始数据:', res.data);
          wx.showToast({
            title: `解析错误: ${error.message}`,
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('OCR请求失败:', error);
        console.error('错误详情:', {
          errMsg: error.errMsg,
          statusCode: error.statusCode,
          errno: error.errno
        });
        
        let errorMsg = 'OCR服务连接失败';
        if (error.errMsg) {
          if (error.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请检查网络连接';
          } else if (error.errMsg.includes('ERR_CONNECTION_RESET')) {
            errorMsg = '连接被重置，请检查服务器状态';
          } else if (error.errMsg.includes('fail')) {
            errorMsg = '无法连接到OCR服务器';
          }
        }
        
        // 显示详细错误信息
        wx.showModal({
          title: 'OCR连接失败',
          content: `错误代码: ${error.errno}\n错误信息: ${error.errMsg}\n\n请检查:\n1. 服务器是否运行\n2. 网络连接是否正常\n3. 防火墙是否开放5000端口`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
  }
}); 