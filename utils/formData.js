/**
 * 表单数据管理器
 * 负责病例表单数据的存储、验证和管理
 */

class FormDataManager {
  constructor() {
    this.storageKey = 'case_form_data';
    this.draftKey = 'case_draft';
    this.data = this.loadDraft() || this.getDefaultData();
  }

  /**
   * 获取默认表单数据结构
   */
  getDefaultData() {
    return {
      id: '',
      createTime: '',
      updateTime: '',
      status: 'draft', // draft, completed
      stepCompleted: 0, // 已完成的步骤数
      
      // 基本信息
      basicInfo: {
        gender: '',
        age: ''
      },
      
      // 症状信息
      symptoms: {
        duration: '',
        durationUnit: ''
      },
      
      // 合并疾病
      comorbidities: [],
      
      // 既往病史
      pastHistory: [],
      
      // 影像学报告
      imagingReport: {
        files: [],
        detailReport: '',
        conclusion: ''
      },
      
      // 病理报告
      pathologyReport: {
        files: [],
        diagnosis: ''
      }
    };
  }

  /**
   * 保存草稿到本地存储
   */
  saveDraft() {
    try {
      this.data.updateTime = new Date().toISOString();
      wx.setStorageSync(this.draftKey, this.data);
      console.log('草稿保存成功');
      return true;
    } catch (error) {
      console.error('草稿保存失败:', error);
      return false;
    }
  }

  /**
   * 从本地存储加载草稿
   */
  loadDraft() {
    try {
      const draft = wx.getStorageSync(this.draftKey);
      if (draft && typeof draft === 'object') {
        console.log('草稿加载成功');
        return draft;
      }
    } catch (error) {
      console.error('草稿加载失败:', error);
    }
    return null;
  }

  /**
   * 清除草稿
   */
  clearDraft() {
    try {
      wx.removeStorageSync(this.draftKey);
      console.log('草稿清除成功');
      return true;
    } catch (error) {
      console.error('草稿清除失败:', error);
      return false;
    }
  }

  /**
   * 更新表单数据
   */
  updateData(section, data) {
    if (this.data[section]) {
      this.data[section] = { ...this.data[section], ...data };
      this.saveDraft();
      return true;
    }
    return false;
  }

  /**
   * 获取指定部分的数据
   */
  getData(section) {
    return section ? this.data[section] : this.data;
  }

  /**
   * 设置完成的步骤数
   */
  setStepCompleted(step) {
    this.data.stepCompleted = Math.max(this.data.stepCompleted, step);
    this.saveDraft();
  }

  /**
   * 验证表单数据完整性
   */
  validateComplete() {
    const errors = [];
    
    // 验证基本信息
    if (!this.data.basicInfo.gender) {
      errors.push('请选择性别');
    }
    if (!this.data.basicInfo.age || this.data.basicInfo.age < 0 || this.data.basicInfo.age > 120) {
      errors.push('请输入有效年龄（0-120岁）');
    }
    
    // 验证症状信息
    if (!this.data.symptoms.duration || !this.data.symptoms.durationUnit) {
      errors.push('请完整填写症状发现时间');
    }
    
    return errors;
  }

  /**
   * 提交完整表单
   */
  async submitForm() {
    const errors = this.validateComplete();
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    try {
      // 生成唯一ID
      if (!this.data.id) {
        this.data.id = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      this.data.status = 'completed';
      this.data.createTime = this.data.createTime || new Date().toISOString();
      this.data.updateTime = new Date().toISOString();

      // 保存到已完成病例列表
      const completedCases = this.getCompletedCases();
      const existingIndex = completedCases.findIndex(c => c.id === this.data.id);
      
      if (existingIndex >= 0) {
        completedCases[existingIndex] = { ...this.data };
      } else {
        completedCases.unshift({ ...this.data });
      }

      wx.setStorageSync('completed_cases', completedCases);
      
      // 清除草稿
      this.clearDraft();
      
      console.log('表单提交成功');
      return this.data.id;
    } catch (error) {
      console.error('表单提交失败:', error);
      throw error;
    }
  }

  /**
   * 获取已完成的病例列表
   */
  getCompletedCases() {
    try {
      return wx.getStorageSync('completed_cases') || [];
    } catch (error) {
      console.error('获取已完成病例失败:', error);
      return [];
    }
  }

  /**
   * 根据ID获取特定病例
   */
  getCaseById(id) {
    const cases = this.getCompletedCases();
    return cases.find(c => c.id === id);
  }

  /**
   * 删除指定病例
   */
  deleteCase(id) {
    try {
      const cases = this.getCompletedCases();
      const filteredCases = cases.filter(c => c.id !== id);
      wx.setStorageSync('completed_cases', filteredCases);
      return true;
    } catch (error) {
      console.error('删除病例失败:', error);
      return false;
    }
  }

  /**
   * 重置表单数据
   */
  reset() {
    this.data = this.getDefaultData();
    this.clearDraft();
  }
}

// 创建全局实例
const formDataManager = new FormDataManager();

module.exports = formDataManager;
