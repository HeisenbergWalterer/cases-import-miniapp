/**
 * 表单验证工具
 */

/**
 * 验证规则
 */
const validators = {
  // 必填验证
  required: (value, message = '此项为必填项') => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return null;
  },

  // 年龄验证
  age: (value, message = '请输入有效年龄（0-120岁）') => {
    const age = parseInt(value);
    if (isNaN(age) || age < 0 || age > 120) {
      return message;
    }
    return null;
  },

  // 数字验证
  number: (value, message = '请输入有效数字') => {
    if (isNaN(value) || value === '') {
      return message;
    }
    return null;
  },

  // 正整数验证
  positiveInteger: (value, message = '请输入正整数') => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) {
      return message;
    }
    return null;
  },

  // 文件大小验证（字节）
  fileSize: (file, maxSize = 10 * 1024 * 1024, message = '文件大小不能超过10MB') => {
    if (file && file.size > maxSize) {
      return message;
    }
    return null;
  },

  // 数组长度验证
  arrayLength: (array, min = 1, message = '请至少选择一项') => {
    if (!Array.isArray(array) || array.length < min) {
      return message;
    }
    return null;
  },

  // 文本长度验证
  textLength: (text, min = 1, max = 1000, message = null) => {
    const length = text ? text.length : 0;
    if (length < min) {
      return message || `至少需要输入${min}个字符`;
    }
    if (length > max) {
      return message || `不能超过${max}个字符`;
    }
    return null;
  }
};

/**
 * 表单字段验证器
 */
class FieldValidator {
  constructor() {
    this.rules = {};
  }

  /**
   * 添加验证规则
   */
  addRule(field, rules) {
    this.rules[field] = rules;
  }

  /**
   * 验证单个字段
   */
  validateField(field, value) {
    const fieldRules = this.rules[field];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      let error = null;
      
      if (typeof rule === 'function') {
        error = rule(value);
      } else if (typeof rule === 'object') {
        const { validator, message, ...params } = rule;
        if (validators[validator]) {
          error = validators[validator](value, message, ...Object.values(params));
        }
      }

      if (error) {
        return error;
      }
    }

    return null;
  }

  /**
   * 验证所有字段
   */
  validateAll(data) {
    const errors = {};
    let hasError = false;

    for (const field in this.rules) {
      const error = this.validateField(field, data[field]);
      if (error) {
        errors[field] = error;
        hasError = true;
      }
    }

    return hasError ? errors : null;
  }
}

/**
 * 病例表单验证配置
 */
const caseFormValidator = new FieldValidator();

// 基本信息验证规则
caseFormValidator.addRule('gender', [
  { validator: 'required', message: '请选择性别' }
]);

caseFormValidator.addRule('age', [
  { validator: 'required', message: '请输入年龄' },
  { validator: 'age', message: '请输入有效年龄（0-120岁）' }
]);

// 症状信息验证规则
caseFormValidator.addRule('symptomDuration', [
  { validator: 'required', message: '请输入症状持续时间' },
  { validator: 'positiveInteger', message: '请输入有效的时间数值' }
]);

caseFormValidator.addRule('durationUnit', [
  { validator: 'required', message: '请选择时间单位' }
]);

// 报告验证规则
caseFormValidator.addRule('imagingReport', [
  (value) => {
    if (!value.detailReport && (!value.files || value.files.length === 0)) {
      return '请上传影像学报告文件或填写详细报告';
    }
    return null;
  }
]);

/**
 * 实时验证工具
 */
const realTimeValidator = {
  /**
   * 为输入框添加实时验证
   */
  bindInput(page, fieldName, validatorFn) {
    const originalInput = page[`on${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}Input`];
    
    page[`on${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}Input`] = function(e) {
      const value = e.detail.value;
      const error = validatorFn ? validatorFn(value) : caseFormValidator.validateField(fieldName, value);
      
      this.setData({
        [`${fieldName}Error`]: error
      });

      if (originalInput) {
        originalInput.call(this, e);
      }
    };
  },

  /**
   * 为表单添加提交验证
   */
  bindSubmit(page, formData, onSuccess, onError) {
    const errors = caseFormValidator.validateAll(formData);
    
    if (errors) {
      // 设置错误状态
      const errorData = {};
      for (const field in errors) {
        errorData[`${field}Error`] = errors[field];
      }
      page.setData(errorData);
      
      if (onError) {
        onError(errors);
      }
      return false;
    } else {
      // 清除错误状态
      const clearErrors = {};
      for (const field in page.data) {
        if (field.endsWith('Error')) {
          clearErrors[field] = '';
        }
      }
      page.setData(clearErrors);
      
      if (onSuccess) {
        onSuccess();
      }
      return true;
    }
  }
};

/**
 * 格式化工具
 */
const formatUtils = {
  /**
   * 格式化时间显示
   */
  formatDuration(duration, unit) {
    if (!duration || !unit) return '';
    return `${duration}${unit}`;
  },

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  /**
   * 格式化时间
   */
  formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `${this.formatDate(dateString)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 截断文本
   */
  truncateText(text, maxLength = 50) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
};

module.exports = {
  validators,
  FieldValidator,
  caseFormValidator,
  realTimeValidator,
  formatUtils
};
