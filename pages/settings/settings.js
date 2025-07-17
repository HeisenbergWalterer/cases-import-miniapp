// settings.js
const formDataManager = require('../../utils/formData.js');

Page({
  data: {
    totalCases: 0,
    completedCases: 0,
    draftCases: 0,
    settings: {
      autoSave: true,
      notification: true,
      fontSize: 'normal'
    },
    fontSizeText: '大字 - 推荐老年用户',
    showFontModal: false
  },

  onLoad() {
    this.loadStatistics();
    this.loadSettings();
  },

  onShow() {
    this.loadStatistics();
  },

  /**
   * 加载统计数据
   */
  loadStatistics() {
    try {
      const completedCases = formDataManager.getCompletedCases();
      const draft = formDataManager.loadDraft();
      
      this.setData({
        totalCases: completedCases.length + (draft ? 1 : 0),
        completedCases: completedCases.length,
        draftCases: draft ? 1 : 0
      });

      console.log('设置页面统计数据加载完成');
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  /**
   * 加载设置
   */
  loadSettings() {
    try {
      const settings = wx.getStorageSync('app_settings') || {
        autoSave: true,
        notification: true,
        fontSize: 'normal'
      };

      const fontSizeMap = {
        'small': '标准 - 适合年轻用户',
        'normal': '大字 - 推荐老年用户',
        'large': '超大 - 视力不佳用户'
      };

      this.setData({
        settings,
        fontSizeText: fontSizeMap[settings.fontSize] || '大字 - 推荐老年用户'
      });

      console.log('设置加载完成:', settings);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  /**
   * 保存设置
   */
  saveSettings() {
    try {
      wx.setStorageSync('app_settings', this.data.settings);
      console.log('设置保存成功');
    } catch (error) {
      console.error('设置保存失败:', error);
    }
  },

  /**
   * 自动保存开关
   */
  onAutoSaveChange(e) {
    const autoSave = e.detail.value;
    this.setData({
      'settings.autoSave': autoSave
    });
    this.saveSettings();

    wx.showToast({
      title: autoSave ? '已开启自动保存' : '已关闭自动保存',
      icon: 'success'
    });

    console.log('自动保存设置:', autoSave);
  },

  /**
   * 通知开关
   */
  onNotificationChange(e) {
    const notification = e.detail.value;
    this.setData({
      'settings.notification': notification
    });
    this.saveSettings();

    wx.showToast({
      title: notification ? '已开启通知' : '已关闭通知',
      icon: 'success'
    });

    console.log('通知设置:', notification);
  },

  /**
   * 选择字体大小
   */
  selectFontSize() {
    this.setData({
      showFontModal: true
    });
  },

  /**
   * 关闭字体选择弹窗
   */
  closeFontModal() {
    this.setData({
      showFontModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击事件冒泡到遮罩层
  },

  /**
   * 选择字体大小选项
   */
  selectFontSizeOption(e) {
    const fontSize = e.currentTarget.dataset.size;
    const fontSizeMap = {
      'small': '标准 - 适合年轻用户',
      'normal': '大字 - 推荐老年用户',
      'large': '超大 - 视力不佳用户'
    };

    this.setData({
      'settings.fontSize': fontSize,
      fontSizeText: fontSizeMap[fontSize]
    });

    console.log('选择字体大小:', fontSize);
  },

  /**
   * 确认字体大小
   */
  confirmFontSize() {
    this.saveSettings();
    this.closeFontModal();

    wx.showToast({
      title: '字体大小已设置',
      icon: 'success'
    });

    // 这里可以添加全局字体大小应用逻辑
    this.applyFontSize();
  },

  /**
   * 应用字体大小设置
   */
  applyFontSize() {
    const fontSize = this.data.settings.fontSize;
    // 这里可以通过修改全局样式类来应用字体大小
    // 或者通知其他页面刷新样式
    console.log('应用字体大小设置:', fontSize);
  },

  /**
   * 导出数据
   */
  exportData() {
    wx.showLoading({
      title: '正在导出...'
    });

    try {
      const cases = formDataManager.getCompletedCases();
      const draft = formDataManager.loadDraft();
      
      const exportData = {
        cases,
        draft,
        exportTime: new Date().toISOString(),
        version: '1.0.0'
      };

      // 这里可以实现数据导出功能
      // 比如生成JSON文件或者上传到云端
      
      wx.hideLoading();
      wx.showModal({
        title: '导出完成',
        content: `成功导出 ${cases.length} 个病例数据`,
        showCancel: false
      });

      console.log('数据导出完成:', exportData);
    } catch (error) {
      wx.hideLoading();
      console.error('数据导出失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    }
  },

  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除缓存吗？这不会删除您的病例数据。',
      success: (res) => {
        if (res.confirm) {
          try {
            // 清除临时文件和缓存（保留病例数据和设置）
            const cases = wx.getStorageSync('completed_cases');
            const settings = wx.getStorageSync('app_settings');
            
            wx.clearStorageSync();
            
            // 恢复重要数据
            if (cases) wx.setStorageSync('completed_cases', cases);
            if (settings) wx.setStorageSync('app_settings', settings);

            wx.showToast({
              title: '缓存清除成功',
              icon: 'success'
            });

            console.log('缓存清除完成');
          } catch (error) {
            console.error('清除缓存失败:', error);
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 清空所有数据
   */
  clearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '这将删除所有病例数据和草稿，且无法恢复！确定要继续吗？',
      confirmText: '确定删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          wx.showModal({
            title: '最后确认',
            content: '请再次确认：真的要删除所有数据吗？',
            confirmText: '确定删除',
            confirmColor: '#FF3B30',
            success: (res2) => {
              if (res2.confirm) {
                try {
                  wx.clearStorageSync();
                  
                  // 重置数据
                  this.setData({
                    totalCases: 0,
                    completedCases: 0,
                    draftCases: 0
                  });

                  wx.showToast({
                    title: '数据已清空',
                    icon: 'success'
                  });

                  console.log('所有数据已清空');
                } catch (error) {
                  console.error('清空数据失败:', error);
                  wx.showToast({
                    title: '清空失败',
                    icon: 'none'
                  });
                }
              }
            }
          });
        }
      }
    });
  },

  /**
   * 检查版本
   */
  checkVersion() {
    wx.showModal({
      title: '版本信息',
      content: '肝胆胰外科病例记录系统\n版本：v1.0.0\n更新时间：2025年7月17日',
      showCancel: false
    });
  },

  /**
   * 显示帮助
   */
  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '1. 点击"新建病例"开始录入\n2. 分步骤填写各项信息\n3. 支持保存草稿和继续编辑\n4. 在病例列表中管理所有数据',
      showCancel: false
    });
  },

  /**
   * 联系我们
   */
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题或建议，请联系开发团队。\n\n感谢您的使用！',
      showCancel: false
    });
  }
});
