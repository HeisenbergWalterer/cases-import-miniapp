// case-list.js
const formDataManager = require('../../utils/formData.js');
const { formatUtils } = require('../../utils/validator.js');

Page({
  data: {
    caseList: [],
    filteredCaseList: [],
    searchKeyword: '',
    activeFilter: 'all',
    todayCount: 0,
    recentCount: 0,
    isLoading: false
  },

  onLoad() {
    this.loadCaseList();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadCaseList();
  },

  /**
   * 加载病例列表
   */
  loadCaseList() {
    this.setData({ isLoading: true });

    try {
      const cases = formDataManager.getCompletedCases();
      const processedCases = this.processCaseList(cases);
      
      this.setData({
        caseList: processedCases,
        filteredCaseList: processedCases,
        isLoading: false
      });

      this.calculateStatistics(processedCases);
      this.applyCurrentFilter();

      console.log('病例列表加载完成，共', processedCases.length, '条');
    } catch (error) {
      console.error('加载病例列表失败:', error);
      this.setData({ isLoading: false });
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    }
  },

  /**
   * 处理病例列表数据
   */
  processCaseList(cases) {
    return cases.map(caseItem => {
      // 格式化创建时间
      const createTime = new Date(caseItem.createTime);
      const createTimeText = formatUtils.formatDateTime(caseItem.createTime);

      // 格式化合并疾病文本
      const comorbiditiesText = caseItem.comorbidities && caseItem.comorbidities.length > 0
        ? caseItem.comorbidities.slice(0, 2).join('、') + (caseItem.comorbidities.length > 2 ? '等' : '')
        : '';

      // 格式化既往病史文本
      const pastHistoryText = caseItem.pastHistory && caseItem.pastHistory.length > 0
        ? caseItem.pastHistory.slice(0, 2).join('、') + (caseItem.pastHistory.length > 2 ? '等' : '')
        : '';

      // 计算文件总数
      const imagingFiles = caseItem.imagingReport?.files?.length || 0;
      const pathologyFiles = caseItem.pathologyReport?.files?.length || 0;
      const totalFiles = imagingFiles + pathologyFiles;

      return {
        ...caseItem,
        createTime,
        createTimeText,
        comorbiditiesText,
        pastHistoryText,
        totalFiles
      };
    }).sort((a, b) => new Date(b.createTime) - new Date(a.createTime)); // 按创建时间倒序
  },

  /**
   * 计算统计数据
   */
  calculateStatistics(cases) {
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
      todayCount,
      recentCount
    });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });

    // 防抖搜索
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.performSearch(keyword);
    }, 300);
  },

  /**
   * 搜索确认
   */
  onSearch(e) {
    const keyword = e.detail.value;
    this.performSearch(keyword);
  },

  /**
   * 执行搜索
   */
  performSearch(keyword) {
    if (!keyword) {
      this.applyCurrentFilter();
      return;
    }

    const filtered = this.data.caseList.filter(caseItem => {
      const searchText = `
        ${caseItem.id}
        ${caseItem.basicInfo.gender}
        ${caseItem.basicInfo.age}
        ${caseItem.comorbiditiesText}
        ${caseItem.pastHistoryText}
        ${caseItem.imagingReport?.detailReport || ''}
        ${caseItem.imagingReport?.conclusion || ''}
        ${caseItem.pathologyReport?.diagnosis || ''}
      `.toLowerCase();

      return searchText.includes(keyword.toLowerCase());
    });

    this.setData({
      filteredCaseList: filtered
    });

    console.log('搜索结果:', keyword, '找到', filtered.length, '条');
  },

  /**
   * 筛选切换
   */
  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({
      activeFilter: filter,
      searchKeyword: '' // 清空搜索
    });

    this.applyCurrentFilter();
  },

  /**
   * 应用当前筛选
   */
  applyCurrentFilter() {
    const { activeFilter, caseList } = this.data;
    let filtered = [...caseList];

    if (activeFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      filtered = caseList.filter(caseItem => {
        return new Date(caseItem.createTime) >= today;
      });
    } else if (activeFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      
      filtered = caseList.filter(caseItem => {
        return new Date(caseItem.createTime) >= weekAgo;
      });
    }

    this.setData({
      filteredCaseList: filtered
    });
  },

  /**
   * 导航到病例详情
   */
  navigateToCaseDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/case-detail/case-detail?id=${id}`
    });

    console.log('查看病例详情:', id);
  },

  /**
   * 编辑病例
   */
  editCase(e) {
    const id = e.currentTarget.dataset.id;
    
    // 加载病例数据到表单管理器
    const caseData = formDataManager.getCaseById(id);
    if (caseData) {
      // 将病例数据设为当前草稿
      formDataManager.data = { ...caseData };
      formDataManager.saveDraft();
      
      wx.navigateTo({
        url: '/pages/case-entry/case-entry?step=1&fromEdit=true'
      });
      
      console.log('编辑病例:', id);
    } else {
      wx.showToast({
        title: '病例不存在',
        icon: 'none'
      });
    }
  },

  /**
   * 分享病例
   */
  shareCase(e) {
    const id = e.currentTarget.dataset.id;
    const caseData = formDataManager.getCaseById(id);
    
    if (!caseData) {
      wx.showToast({
        title: '病例不存在',
        icon: 'none'
      });
      return;
    }

    // 生成分享内容（脱敏处理）
    const shareTitle = `病例分享 - ${caseData.basicInfo.gender}，${caseData.basicInfo.age}岁`;
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });

    // 这里可以添加更多分享逻辑
    console.log('分享病例:', id);
  },

  /**
   * 删除病例
   */
  deleteCase(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个病例吗？',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      success: (res) => {
        if (res.confirm) {
          try {
            const success = formDataManager.deleteCase(id);
            
            if (success) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 重新加载列表
              this.loadCaseList();
              
              console.log('病例删除成功:', id);
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
   * 导航到新建病例
   */
  navigateToNewCase() {
    // 重置表单数据
    formDataManager.reset();
    
    wx.navigateTo({
      url: '/pages/case-entry/case-entry?step=1'
    });
    
    console.log('新建病例');
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadCaseList();
    
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 触底加载更多（预留）
   */
  onReachBottom() {
    // 目前使用本地存储，不需要分页
    // 后续接入后端API时可以实现分页加载
  },

  /**
   * 页面分享
   */
  onShareAppMessage() {
    return {
      title: '肝胆胰外科病例管理系统',
      path: '/pages/index/index'
    };
  }
});
