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
      ultrasoundConclusion: '',
      pathologyReport: '',
      immunohistochemistry: ''
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
        ultrasoundConclusion: '',
        pathologyReport: '',
        immunohistochemistry: ''
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
    this.setData({
      [`formData.${field}`]: value
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

    // 构建完整的病例数据
    const caseData = {
      ...this.data.formData,
      // 确保基本信息来自用户个人信息
      patientName: userInfo.name,
      gender: userInfo.gender,
      age: userInfo.age,
      id: Date.now().toString(),
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString()
    };

    // 保存到本地存储
    const cases = wx.getStorageSync('medicalCases') || [];
    cases.push(caseData);
    wx.setStorageSync('medicalCases', cases);

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
  }
}); 