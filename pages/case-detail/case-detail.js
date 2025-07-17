// case-detail.js
const formDataManager = require('../../utils/formData.js');
const { formatUtils } = require('../../utils/validator.js');

Page({
  data: {
    caseId: '',
    caseData: {},
    createTimeText: '',
    updateTimeText: '',
    isLoading: true
  },

  onLoad(options) {
    const caseId = options.id;
    if (!caseId) {
      wx.showToast({
        title: '病例ID不存在',
        icon: 'none'
      });
      wx.navigateBack();
      return;
    }

    this.setData({ caseId });
    this.loadCaseData();
  },

  /**
   * 加载病例数据
   */
  loadCaseData() {
    this.setData({ isLoading: true });

    try {
      const caseData = formDataManager.getCaseById(this.data.caseId);
      
      if (!caseData) {
        throw new Error('病例不存在');
      }

      // 处理文件类型
      const processFiles = (files) => {
        return files.map(file => ({
          ...file,
          type: file.name.toLowerCase().includes('.pdf') ? 'pdf' : 'image'
        }));
      };

      // 处理数据
      const processedData = {
        ...caseData,
        imagingReport: {
          ...caseData.imagingReport,
          files: processFiles(caseData.imagingReport?.files || [])
        },
        pathologyReport: {
          ...caseData.pathologyReport,
          files: processFiles(caseData.pathologyReport?.files || [])
        }
      };

      this.setData({
        caseData: processedData,
        createTimeText: formatUtils.formatDateTime(caseData.createTime),
        updateTimeText: formatUtils.formatDateTime(caseData.updateTime),
        isLoading: false
      });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: `病例 #${caseData.id.slice(-6)}`
      });

      console.log('病例数据加载完成:', caseData);
    } catch (error) {
      console.error('加载病例数据失败:', error);
      this.setData({ isLoading: false });
      
      wx.showModal({
        title: '加载失败',
        content: error.message || '无法加载病例数据',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
    }
  },

  /**
   * 预览文件
   */
  previewFile(e) {
    const url = e.currentTarget.dataset.url;
    
    if (!url) {
      wx.showToast({
        title: '文件不存在',
        icon: 'none'
      });
      return;
    }

    // 获取所有图片文件用于预览
    const allFiles = [
      ...this.data.caseData.imagingReport.files,
      ...this.data.caseData.pathologyReport.files
    ];
    
    const imageFiles = allFiles
      .filter(file => file.type === 'image')
      .map(file => file.path);

    if (imageFiles.includes(url)) {
      // 预览图片
      wx.previewImage({
        current: url,
        urls: imageFiles
      });
    } else {
      // PDF文件暂时用toast提示
      wx.showToast({
        title: 'PDF文件预览功能开发中',
        icon: 'none'
      });
    }

    console.log('预览文件:', url);
  },

  /**
   * 编辑病例
   */
  editCase() {
    try {
      // 将当前病例数据设为草稿
      formDataManager.data = { ...this.data.caseData };
      formDataManager.saveDraft();
      
      wx.navigateTo({
        url: '/pages/case-entry/case-entry?step=1&fromEdit=true'
      });
      
      console.log('开始编辑病例:', this.data.caseId);
    } catch (error) {
      console.error('编辑病例失败:', error);
      wx.showToast({
        title: '编辑失败',
        icon: 'none'
      });
    }
  },

  /**
   * 分享病例
   */
  shareCase() {
    const caseData = this.data.caseData;
    
    // 生成分享内容（脱敏处理）
    const shareContent = this.generateShareContent(caseData);
    
    wx.showActionSheet({
      itemList: ['复制病例信息', '生成分享图片', '发送给朋友'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.copyToClipboard(shareContent);
            break;
          case 1:
            this.generateShareImage();
            break;
          case 2:
            this.shareToFriend();
            break;
        }
      }
    });

    console.log('分享病例:', this.data.caseId);
  },

  /**
   * 生成分享内容
   */
  generateShareContent(caseData) {
    const content = `【肝胆胰外科病例】
    
基本信息：
性别：${caseData.basicInfo.gender || '未填写'}
年龄：${caseData.basicInfo.age ? caseData.basicInfo.age + '岁' : '未填写'}

症状信息：
症状时间：${caseData.symptoms.duration && caseData.symptoms.durationUnit ? 
  caseData.symptoms.duration + caseData.symptoms.durationUnit : '未填写'}

${caseData.comorbidities.length > 0 ? `合并疾病：${caseData.comorbidities.join('、')}` : ''}

${caseData.pastHistory.length > 0 ? `既往病史：${caseData.pastHistory.join('、')}` : ''}

${caseData.imagingReport.conclusion ? `影像学结论：${caseData.imagingReport.conclusion}` : ''}

${caseData.pathologyReport.diagnosis ? `病理诊断：${caseData.pathologyReport.diagnosis}` : ''}

记录时间：${this.data.createTimeText}
————————————————
来源：肝胆胰外科病例记录系统`;

    return content;
  },

  /**
   * 复制到剪贴板
   */
  copyToClipboard(content) {
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 生成分享图片
   */
  generateShareImage() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
    // 这里可以实现canvas绘制分享图片的功能
  },

  /**
   * 分享给朋友
   */
  shareToFriend() {
    // 触发小程序分享
    wx.showShareMenu({
      withShareTicket: true
    });
    
    wx.showToast({
      title: '请使用右上角分享',
      icon: 'none'
    });
  },

  /**
   * 删除病例
   */
  deleteCase() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个病例吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          try {
            const success = formDataManager.deleteCase(this.data.caseId);
            
            if (success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1000);
              
              console.log('病例删除成功:', this.data.caseId);
            } else {
              throw new Error('删除失败');
            }
          } catch (error) {
            console.error('删除病例失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    const caseData = this.data.caseData;
    return {
      title: `病例分享 - ${caseData.basicInfo.gender}，${caseData.basicInfo.age}岁`,
      path: `/pages/case-detail/case-detail?id=${this.data.caseId}`,
      imageUrl: '/assets/images/share-case.png' // 需要添加分享图片
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const caseData = this.data.caseData;
    return {
      title: `肝胆胰外科病例 - ${caseData.basicInfo.gender}，${caseData.basicInfo.age}岁`
    };
  }
});
