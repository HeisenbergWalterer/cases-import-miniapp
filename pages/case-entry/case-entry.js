// case-entry.js
const formDataManager = require('../../utils/formData.js');
const { caseFormValidator, formatUtils } = require('../../utils/validator.js');

Page({
  data: {
    currentStep: 1,
    steps: ['基本信息', '症状信息', '合并疾病', '既往病史', '影像报告', '病理报告'],
    formData: {},
    errors: {},
    
    // 时间单位选择
    durationUnits: ['天', '周', '月', '年'],
    durationUnitIndex: -1,
    
    // 合并疾病选项
    comorbidityOptions: [
      { value: '高血压', label: '高血压', checked: false },
      { value: '糖尿病', label: '糖尿病', checked: false },
      { value: '冠心病/心梗', label: '冠心病/心梗', checked: false },
      { value: '脑梗/脑出血', label: '脑梗/脑出血', checked: false },
      { value: '慢性支气管炎', label: '慢性支气管炎', checked: false },
      { value: '肝功能不全', label: '肝功能不全', checked: false },
      { value: '肾功能不全', label: '肾功能不全', checked: false },
      { value: '恶性肿瘤病史', label: '恶性肿瘤病史', checked: false },
      { value: '免疫缺陷疾病', label: '免疫缺陷疾病', checked: false }
    ],
    
    // 既往病史选项
    pastHistoryOptions: [
      { value: '胆囊炎急性发作病史', label: '胆囊炎急性发作病史', checked: false },
      { value: '黄疸', label: '黄疸', checked: false },
      { value: '胆总管结石', label: '胆总管结石', checked: false },
      { value: '胰腺炎', label: '胰腺炎', checked: false }
    ],
    
    isLoading: false
  },

  onLoad(options) {
    // 从参数获取步骤信息
    const step = parseInt(options.step) || 1;
    const fromDraft = options.fromDraft === 'true';
    
    this.setData({
      currentStep: step
    });

    // 加载表单数据
    this.loadFormData();
    
    // 设置页面标题
    wx.setNavigationBarTitle({
      title: `病例录入 - ${this.data.steps[step - 1]}`
    });

    console.log('病例录入页面加载，步骤:', step, '来自草稿:', fromDraft);
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadFormData();
  },

  /**
   * 加载表单数据
   */
  loadFormData() {
    try {
      const data = formDataManager.getData();
      
      // 同步时间单位选择器
      let durationUnitIndex = -1;
      if (data.symptoms.durationUnit) {
        durationUnitIndex = this.data.durationUnits.indexOf(data.symptoms.durationUnit);
      }

      // 同步复选框状态
      const comorbidityOptions = this.data.comorbidityOptions.map(option => ({
        ...option,
        checked: data.comorbidities.includes(option.value)
      }));

      const pastHistoryOptions = this.data.pastHistoryOptions.map(option => ({
        ...option,
        checked: data.pastHistory.includes(option.value)
      }));

      this.setData({
        formData: data,
        durationUnitIndex,
        comorbidityOptions,
        pastHistoryOptions
      });

      console.log('表单数据加载完成:', data);
    } catch (error) {
      console.error('加载表单数据失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 性别选择
   */
  onGenderChange(e) {
    const gender = e.currentTarget.dataset.value;
    formDataManager.updateData('basicInfo', { gender });
    
    this.setData({
      'formData.basicInfo.gender': gender,
      'errors.gender': ''
    });

    console.log('性别已选择:', gender);
  },

  /**
   * 年龄输入
   */
  onAgeInput(e) {
    const age = parseInt(e.detail.value) || '';
    formDataManager.updateData('basicInfo', { age });
    
    this.setData({
      'formData.basicInfo.age': age,
      'errors.age': ''
    });

    console.log('年龄已输入:', age);
  },

  /**
   * 症状持续时间输入
   */
  onDurationInput(e) {
    const duration = parseInt(e.detail.value) || '';
    formDataManager.updateData('symptoms', { duration });
    
    this.setData({
      'formData.symptoms.duration': duration,
      'errors.duration': ''
    });

    console.log('症状持续时间已输入:', duration);
  },

  /**
   * 时间单位选择
   */
  onDurationUnitChange(e) {
    const index = parseInt(e.detail.value);
    const unit = this.data.durationUnits[index];
    
    formDataManager.updateData('symptoms', { durationUnit: unit });
    
    this.setData({
      durationUnitIndex: index,
      'formData.symptoms.durationUnit': unit,
      'errors.durationUnit': ''
    });

    console.log('时间单位已选择:', unit);
  },

  /**
   * 合并疾病选择
   */
  onComorbidityChange(e) {
    const value = e.currentTarget.dataset.value;
    const comorbidityOptions = this.data.comorbidityOptions.map(option => {
      if (option.value === value) {
        option.checked = !option.checked;
      }
      return option;
    });

    const selectedComorbidities = comorbidityOptions
      .filter(option => option.checked)
      .map(option => option.value);

    formDataManager.updateData('comorbidities', selectedComorbidities);

    this.setData({
      comorbidityOptions,
      'formData.comorbidities': selectedComorbidities
    });

    console.log('合并疾病已选择:', selectedComorbidities);
  },

  /**
   * 既往病史选择
   */
  onPastHistoryChange(e) {
    const value = e.currentTarget.dataset.value;
    const pastHistoryOptions = this.data.pastHistoryOptions.map(option => {
      if (option.value === value) {
        option.checked = !option.checked;
      }
      return option;
    });

    const selectedPastHistory = pastHistoryOptions
      .filter(option => option.checked)
      .map(option => option.value);

    formDataManager.updateData('pastHistory', selectedPastHistory);

    this.setData({
      pastHistoryOptions,
      'formData.pastHistory': selectedPastHistory
    });

    console.log('既往病史已选择:', selectedPastHistory);
  },

  /**
   * 选择影像学报告文件
   */
  chooseImagingFile() {
    this.chooseFile('imaging');
  },

  /**
   * 选择病理报告文件
   */
  choosePathologyFile() {
    this.chooseFile('pathology');
  },

  /**
   * 通用文件选择方法
   */
  chooseFile(type) {
    wx.chooseMedia({
      count: 3,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles.map(file => ({
          path: file.tempFilePath,
          name: `${type}_${Date.now()}.${file.tempFilePath.split('.').pop()}`,
          size: file.size,
          sizeText: formatUtils.formatFileSize(file.size)
        }));

        const section = type === 'imaging' ? 'imagingReport' : 'pathologyReport';
        const currentFiles = this.data.formData[section].files || [];
        const newFiles = [...currentFiles, ...files];

        formDataManager.updateData(section, { files: newFiles });

        this.setData({
          [`formData.${section}.files`]: newFiles
        });

        wx.showToast({
          title: '文件上传成功',
          icon: 'success'
        });

        console.log(`${type}文件已选择:`, files);
      },
      fail: (error) => {
        console.error('文件选择失败:', error);
        wx.showToast({
          title: '文件选择失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 移除影像学报告文件
   */
  removeImagingFile(e) {
    this.removeFile('imagingReport', e.currentTarget.dataset.index);
  },

  /**
   * 移除病理报告文件
   */
  removePathologyFile(e) {
    this.removeFile('pathologyReport', e.currentTarget.dataset.index);
  },

  /**
   * 通用文件移除方法
   */
  removeFile(section, index) {
    const files = [...this.data.formData[section].files];
    files.splice(index, 1);

    formDataManager.updateData(section, { files });

    this.setData({
      [`formData.${section}.files`]: files
    });

    wx.showToast({
      title: '文件已删除',
      icon: 'success'
    });

    console.log(`${section}文件已删除，索引:`, index);
  },

  /**
   * 详细报告输入
   */
  onDetailReportInput(e) {
    const detailReport = e.detail.value;
    formDataManager.updateData('imagingReport', { detailReport });
    
    this.setData({
      'formData.imagingReport.detailReport': detailReport
    });
  },

  /**
   * 检查结论输入
   */
  onConclusionInput(e) {
    const conclusion = e.detail.value;
    formDataManager.updateData('imagingReport', { conclusion });
    
    this.setData({
      'formData.imagingReport.conclusion': conclusion
    });
  },

  /**
   * 病理诊断输入
   */
  onDiagnosisInput(e) {
    const diagnosis = e.detail.value;
    formDataManager.updateData('pathologyReport', { diagnosis });
    
    this.setData({
      'formData.pathologyReport.diagnosis': diagnosis
    });
  },

  /**
   * 上一步
   */
  prevStep() {
    if (this.data.currentStep > 1) {
      const newStep = this.data.currentStep - 1;
      this.setData({
        currentStep: newStep
      });

      wx.setNavigationBarTitle({
        title: `病例录入 - ${this.data.steps[newStep - 1]}`
      });

      console.log('返回上一步:', newStep);
    }
  },

  /**
   * 下一步
   */
  nextStep() {
    if (this.validateCurrentStep()) {
      if (this.data.currentStep < 6) {
        const newStep = this.data.currentStep + 1;
        
        // 更新已完成步骤
        formDataManager.setStepCompleted(this.data.currentStep);
        
        this.setData({
          currentStep: newStep
        });

        wx.setNavigationBarTitle({
          title: `病例录入 - ${this.data.steps[newStep - 1]}`
        });

        console.log('进入下一步:', newStep);
      }
    }
  },

  /**
   * 验证当前步骤
   */
  validateCurrentStep() {
    const step = this.data.currentStep;
    const errors = {};
    let isValid = true;

    switch (step) {
      case 1: // 基本信息
        if (!this.data.formData.basicInfo.gender) {
          errors.gender = '请选择性别';
          isValid = false;
        }
        if (!this.data.formData.basicInfo.age || 
            this.data.formData.basicInfo.age < 0 || 
            this.data.formData.basicInfo.age > 120) {
          errors.age = '请输入有效年龄（0-120岁）';
          isValid = false;
        }
        break;

      case 2: // 症状信息
        if (!this.data.formData.symptoms.duration) {
          errors.duration = '请输入症状持续时间';
          isValid = false;
        }
        if (!this.data.formData.symptoms.durationUnit) {
          errors.durationUnit = '请选择时间单位';
          isValid = false;
        }
        break;

      // 第3、4步为可选项，不强制验证
      case 3:
      case 4:
        break;

      // 第5、6步建议至少填写一项，但不强制
      case 5:
      case 6:
        break;
    }

    this.setData({ errors });

    if (!isValid) {
      wx.showToast({
        title: '请完善必填信息',
        icon: 'none'
      });
    }

    return isValid;
  },

  /**
   * 保存草稿
   */
  saveDraft() {
    this.setData({ isLoading: true });

    try {
      formDataManager.setStepCompleted(this.data.currentStep);
      const success = formDataManager.saveDraft();
      
      if (success) {
        wx.showToast({
          title: '草稿保存成功',
          icon: 'success'
        });
      } else {
        throw new Error('保存失败');
      }
    } catch (error) {
      console.error('保存草稿失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 提交表单
   */
  async submitForm() {
    this.setData({ isLoading: true });

    try {
      // 验证所有步骤
      if (!this.validateAllSteps()) {
        throw new Error('表单验证失败');
      }

      // 提交表单
      const caseId = await formDataManager.submitForm();

      wx.showToast({
        title: '病例提交成功',
        icon: 'success'
      });

      // 延迟跳转到详情页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/case-detail/case-detail?id=${caseId}`
        });
      }, 1500);

      console.log('病例提交成功，ID:', caseId);
    } catch (error) {
      console.error('提交表单失败:', error);
      wx.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 验证所有步骤
   */
  validateAllSteps() {
    // 暂时保存当前步骤
    const originalStep = this.data.currentStep;
    let allValid = true;

    // 验证前两个必填步骤
    for (let step = 1; step <= 2; step++) {
      this.setData({ currentStep: step });
      if (!this.validateCurrentStep()) {
        allValid = false;
        break;
      }
    }

    // 恢复当前步骤
    this.setData({ currentStep: originalStep });

    return allValid;
  }
});
