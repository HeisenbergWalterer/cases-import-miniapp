// index.js
const formDataManager = require('../../utils/formData.js');
const { formatUtils } = require('../../utils/validator.js');

Page({
  data: {
    caseCount: 0,
    todayCount: 0,
    recentCount: 0,
    hasDraft: false,
    draftUpdateTime: ''
  },

  onLoad() {
    this.loadStatistics();
    this.checkDraft();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadStatistics();
    this.checkDraft();
  },

  /**
   * 加载统计信息
   */
  loadStatistics() {
    try {
      const cases = formDataManager.getCompletedCases();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let todayCount = 0;
      let recentCount = 0;

      cases.forEach(caseItem => {
        const createTime = new Date(caseItem.createTime);
        
        if (createTime >= today) {
          todayCount++;
        }
        
        if (createTime >= sevenDaysAgo) {
          recentCount++;
        }
      });

      this.setData({
        caseCount: cases.length,
        todayCount,
        recentCount
      });

      console.log('统计信息加载完成:', {
        total: cases.length,
        today: todayCount,
        recent: recentCount
      });
    } catch (error) {
      console.error('加载统计信息失败:', error);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 检查草稿状态
   */
  checkDraft() {
    try {
      const draft = formDataManager.loadDraft();
      
      if (draft && draft.updateTime) {
        this.setData({
          hasDraft: true,
          draftUpdateTime: formatUtils.formatDateTime(draft.updateTime)
        });
        console.log('发现草稿:', draft.updateTime);
      } else {
        this.setData({
          hasDraft: false,
          draftUpdateTime: ''
        });
      }
    } catch (error) {
      console.error('检查草稿失败:', error);
      this.setData({
        hasDraft: false,
        draftUpdateTime: ''
      });
    }
  },

  /**
   * 导航到新建病例
   */
  navigateToNewCase() {
    try {
      // 重置表单数据，开始新的病例
      formDataManager.reset();
      
      wx.navigateTo({
        url: '/pages/case-entry/case-entry?step=1'
      });
      
      console.log('开始新建病例');
    } catch (error) {
      console.error('导航到新建病例失败:', error);
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      });
    }
  },

  /**
   * 导航到病例列表
   */
  navigateToCaseList() {
    try {
      wx.navigateTo({
        url: '/pages/case-list/case-list'
      });
      
      console.log('导航到病例列表');
    } catch (error) {
      console.error('导航到病例列表失败:', error);
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      });
    }
  },

  /**
   * 导航到草稿继续编辑
   */
  navigateToDraft() {
    try {
      const draft = formDataManager.loadDraft();
      
      if (!draft) {
        wx.showToast({
          title: '草稿不存在',
          icon: 'none'
        });
        return;
      }

      // 根据已完成的步骤数决定跳转到哪一步
      const nextStep = (draft.stepCompleted || 0) + 1;
      const targetStep = Math.min(Math.max(nextStep, 1), 6);
      
      wx.navigateTo({
        url: `/pages/case-entry/case-entry?step=${targetStep}&fromDraft=true`
      });
      
      console.log('继续编辑草稿, 步骤:', targetStep);
    } catch (error) {
      console.error('导航到草稿失败:', error);
      wx.showToast({
        title: '打开草稿失败',
        icon: 'none'
      });
    }
  },

  /**
   * 导航到设置页面
   */
  navigateToSettings() {
    try {
      wx.navigateTo({
        url: '/pages/settings/settings'
      });
      
      console.log('导航到设置页面');
    } catch (error) {
      console.error('导航到设置页面失败:', error);
      wx.showToast({
        title: '页面跳转失败',
        icon: 'none'
      });
    }
  },

  /**
   * 页面分享配置
   */
  onShareAppMessage() {
    return {
      title: '肝胆胰外科病例记录系统',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share-cover.png' // 需要添加分享图片
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '肝胆胰外科病例记录系统 - 专业的病例管理工具'
    };
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadStatistics();
    this.checkDraft();
    
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
});
