// chat.js
Page({
  data: {
    // 聊天消息列表
    messages: [],
    
    // 输入框内容
    inputMessage: '',
    
    // 滚动相关
    scrollTop: 0,
    scrollIntoView: '',
    
    // 历史对话弹窗
    showHistoryModal: false,
    
    // 历史对话列表
    historyChats: [],
    
    // 当前聊天ID
    currentChatId: null,
    
    // 个人模式开关
    personalMode: true,
    
    // 键盘状态
    keyboardHeight: 0,
    isKeyboardShow: false,
    
    // AI回复状态
    isAITyping: false,
    
    // 加载状态
    isLoading: false
  },

  onLoad() {
    this.initializeChat();
    
    // 监听键盘高度变化
    wx.onKeyboardHeightChange((res) => {
      this.setData({
        keyboardHeight: res.height,
        isKeyboardShow: res.height > 0
      });
      
      // 键盘弹起时滚动到底部
      if (res.height > 0) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    });
  },

  onShow() {
    // 页面显示时滚动到底部
    this.scrollToBottom();
  },
  
  onUnload() {
    // 页面卸载时取消键盘监听
    wx.offKeyboardHeightChange();
  },

  // 初始化聊天
  initializeChat() {
    // 检查用户登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再使用AI聊天功能',
        confirmText: '去登录',
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
    
    // 加载历史聊天会话
    this.loadChatSessions();
    
    // 显示欢迎消息
    this.showWelcomeMessage();
  },

  // 显示欢迎消息
  showWelcomeMessage() {
    if (this.data.messages.length === 0) {
      const welcomeMessage = {
        id: `welcome_${Date.now()}`,
        type: 'ai',
        content: '您好！我是您的AI医疗助手，专注于为您提供健康咨询和医疗建议。\n\n我可以帮助您：\n• 解答健康相关问题\n• 分析症状和体征\n• 提供就医建议\n• 解读检查报告\n\n请注意：我的建议仅供参考，不能替代专业医生的诊断。如有紧急情况，请立即就医！\n\n有什么健康问题想要咨询吗？',
        timestamp: new Date().toLocaleTimeString()
      };
      
      this.setData({
        messages: [welcomeMessage]
      });
      
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  },

  // 加载聊天会话列表
  loadChatSessions() {
    const token = wx.getStorageSync('token');
    if (!token) return;
    
    const baseUrl = getApp().globalData.baseUrl;
    
    wx.request({
      url: `${baseUrl}/chat/sessions`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('获取聊天会话响应:', res);
        if (res.data.success) {
          this.setData({
            historyChats: res.data.sessions || []
          });
        }
      },
      fail: (err) => {
        console.error('获取聊天会话失败:', err);
      }
    });
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputMessage: e.detail.value
    });
  },

  // 输入框获得焦点
  onInputFocus(e) {
    // 延迟滚动到底部，确保键盘完全弹起
    setTimeout(() => {
      this.scrollToBottom();
    }, 300);
  },

  // 输入框失去焦点
  onInputBlur(e) {
    // 键盘收起时的处理
    setTimeout(() => {
      this.setData({
        isKeyboardShow: false,
        keyboardHeight: 0
      });
    }, 100);
  },

  // 发送消息
  sendMessage() {
    const message = this.data.inputMessage.trim();
    if (!message || this.data.isLoading) {
      return;
    }

    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    const messages = [...this.data.messages, userMessage];
    
    this.setData({
      messages: messages,
      inputMessage: '',
      isLoading: true,
      isAITyping: true
    });

    // 滚动到底部
    this.scrollToBottom();

    // 调用AI聊天API
    this.callAIChatAPI(message);
  },

  // 调用AI聊天API
  callAIChatAPI(message) {
    const token = wx.getStorageSync('token');
    const baseUrl = getApp().globalData.baseUrl;
    
    // 准备上下文消息（排除欢迎消息）
    const contextMessages = this.data.messages
      .filter(msg => !msg.id.startsWith('welcome_'))
      .slice(-10) // 只取最近10条消息作为上下文
      .map(msg => ({
        type: msg.type,
        content: msg.content
      }));
    
    console.log('=== 前端AI聊天调试信息 ===');
    console.log('发送消息:', message);
    console.log('当前聊天ID:', this.data.currentChatId);
    console.log('上下文消息数量:', contextMessages.length);
    
    wx.request({
      url: `${baseUrl}/chat/message`,
      method: 'POST',
      timeout: 60000, // 设置60秒超时，适应AI模型处理时间
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      data: {
        message: message,
        chatId: this.data.currentChatId,
        contextMessages: contextMessages
      },
      success: (res) => {
        console.log('AI聊天API响应:', res);
        
        this.setData({
          isLoading: false,
          isAITyping: false
        });
        
        if (res.data.success) {
          // 更新聊天ID（如果是新聊天）
          if (res.data.chatId && !this.data.currentChatId) {
            this.setData({
              currentChatId: res.data.chatId
            });
          }
          
          // 添加AI回复消息
          const aiMessage = {
            id: `ai_${Date.now()}`,
            type: 'ai',
            content: res.data.aiResponse,
            timestamp: new Date().toLocaleTimeString(),
            fallback: res.data.fallback || false
          };
          
          const messages = [...this.data.messages, aiMessage];
          this.setData({
            messages: messages
          });
          
          // 滚动到底部
          this.scrollToBottom();
          
          // 如果是降级响应，显示提示
          if (res.data.fallback) {
            wx.showToast({
              title: 'AI服务暂时不可用',
              icon: 'none',
              duration: 2000
            });
          }
          
          // 重新加载聊天会话列表（更新时间）
          this.loadChatSessions();
          
        } else {
          wx.showToast({
            title: res.data.message || 'AI聊天失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('AI聊天API调用失败:', err);
        
        this.setData({
          isLoading: false,
          isAITyping: false
        });
        
        // 添加错误提示消息
        const errorMessage = {
          id: `error_${Date.now()}`,
          type: 'ai',
          content: '抱歉，网络连接失败，请检查网络后重试。\n\n如有紧急医疗问题，请直接联系：\n• 急救电话：120\n• 医院急诊科',
          timestamp: new Date().toLocaleTimeString(),
          error: true
        };
        
        const messages = [...this.data.messages, errorMessage];
        this.setData({
          messages: messages
        });
        
        this.scrollToBottom();
        
        wx.showToast({
          title: '网络连接失败',
          icon: 'error'
        });
      }
    });
  },

  // 滚动到底部
  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const lastMessageId = `msg-${messages[messages.length - 1].id}`;
      this.setData({
        scrollIntoView: lastMessageId
      });
      
      // 添加延迟确保滚动完全生效，特别是AI回复后
      setTimeout(() => {
        this.setData({
          scrollIntoView: lastMessageId
        });
      }, 100);
    }
  },

  // 显示历史对话弹窗
  showHistoryDialog() {
    this.setData({
      showHistoryModal: true
    });
  },

  // 隐藏历史对话弹窗
  hideHistoryDialog() {
    this.setData({
      showHistoryModal: false
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击弹窗内容时关闭弹窗
  },

  // 开启新聊天
  startNewChat() {
    // 直接清空当前聊天，开启新对话
    this.setData({
      messages: [],
      currentChatId: null,
      showHistoryModal: false
    });
    
    // 显示欢迎消息
    this.showWelcomeMessage();
    
    wx.showToast({
      title: '新聊天已开启',
      icon: 'success',
      duration: 1500
    });
  },

  // 加载历史聊天
  loadHistoryChat(e) {
    const chatId = e.currentTarget.dataset.id;
    const token = wx.getStorageSync('token');
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }
    
    console.log('=== 加载历史聊天调试信息 ===');
    console.log('聊天ID:', chatId);
    
    wx.showLoading({
      title: '加载中...'
    });
    
    const baseUrl = getApp().globalData.baseUrl;
    
    wx.request({
      url: `${baseUrl}/chat/sessions/${chatId}/messages`,
      method: 'GET',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        console.log('加载历史聊天响应:', res);
        wx.hideLoading();
        
        if (res.data.success) {
          // 转换消息格式
          const messages = res.data.messages.map(msg => ({
            id: `${msg.type}_${msg.id}`,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timeDisplay
          }));
          
          this.setData({
            messages: messages,
            currentChatId: chatId,
            showHistoryModal: false
          });
          
          // 滚动到底部
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
          
          wx.showToast({
            title: '历史聊天加载成功',
            icon: 'success',
            duration: 1500
          });
        } else {
          wx.showToast({
            title: res.data.message || '加载失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('加载历史聊天失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  // 删除历史聊天
  deleteHistoryChat(e) {
    const chatId = e.currentTarget.dataset.id;
    const token = wx.getStorageSync('token');
    
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'error'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个聊天记录吗？',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#f44336',
      success: (res) => {
        if (res.confirm) {
          this.performDeleteChat(chatId);
        }
      }
    });
  },

  // 执行删除聊天
  performDeleteChat(chatId) {
    const token = wx.getStorageSync('token');
    const baseUrl = getApp().globalData.baseUrl;
    
    wx.showLoading({
      title: '删除中...'
    });
    
    wx.request({
      url: `${baseUrl}/chat/sessions/${chatId}`,
      method: 'DELETE',
      header: {
        'Authorization': `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.success) {
          // 重新加载聊天会话列表
          this.loadChatSessions();
          
          // 如果删除的是当前聊天，清空消息
          if (this.data.currentChatId === chatId) {
            this.setData({
              messages: [],
              currentChatId: null
            });
            this.showWelcomeMessage();
          }
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.message || '删除失败',
            icon: 'error'
          });
        }
      },
      fail: (err) => {
        console.error('删除聊天失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },



  onShareAppMessage() {
    return {
      title: 'AI医疗助手 - 智能健康咨询',
      path: '/pages/chat/chat'
    };
  }
}); 