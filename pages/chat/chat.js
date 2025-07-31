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
    historyChats: [
      {
        id: 1,
        title: '关于高血压的咨询',
        time: '2024-01-15 14:30'
      },
      {
        id: 2,
        title: '糖尿病饮食建议',
        time: '2024-01-14 09:15'
      },
      {
        id: 3,
        title: '体检报告解读',
        time: '2024-01-13 16:45'
      }
    ],
    
    // 当前聊天ID
    currentChatId: null,
    
    // 个人模式开关
    personalMode: true,
    
    // 键盘状态
    keyboardHeight: 0,
    isKeyboardShow: false
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
    // 可以在这里加载历史消息
    this.loadChatHistory();
  },

  // 加载聊天历史
  loadChatHistory() {
    const chatHistory = wx.getStorageSync('chatHistory') || [];
    this.setData({
      historyChats: chatHistory
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
    if (!message) {
      return;
    }

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    const messages = [...this.data.messages, userMessage];
    
    this.setData({
      messages: messages,
      inputMessage: ''
    });

    // 滚动到底部
    this.scrollToBottom();

    // 模拟AI回复（延迟1秒）
    setTimeout(() => {
      this.simulateAIResponse(message);
    }, 1000);
  },

  // 模拟AI回复
  simulateAIResponse(userMessage) {
    let aiResponse = '抱歉，AI功能正在开发中，暂时无法提供专业的医疗建议。';
    
    // 简单的关键词回复
    if (userMessage.includes('你好') || userMessage.includes('hello')) {
      aiResponse = '你好！我是您的AI医疗助手，有什么健康问题可以咨询我。';
    } else if (userMessage.includes('头痛') || userMessage.includes('发烧')) {
      aiResponse = '根据您描述的症状，建议您及时就医，由专业医生进行诊断。如果症状严重，请立即前往医院。';
    } else if (userMessage.includes('谢谢')) {
      aiResponse = '不客气！如果还有其他健康问题，随时可以咨询我。';
    }

    const aiMessage = {
      id: Date.now() + 1,
      type: 'ai',
      content: aiResponse,
      timestamp: new Date().toLocaleTimeString()
    };

    const messages = [...this.data.messages, aiMessage];
    
    this.setData({
      messages: messages
    });

    // 滚动到底部
    this.scrollToBottom();
  },

  // 滚动到底部
  scrollToBottom() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const lastMessageId = `msg-${messages[messages.length - 1].id}`;
      this.setData({
        scrollIntoView: lastMessageId
      });
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
    wx.showModal({
      title: '开启新聊天',
      content: '确定要开启新的聊天对话吗？当前对话将被保存到历史记录中。',
      success: (res) => {
        if (res.confirm) {
          // 保存当前聊天到历史记录
          this.saveCurrentChat();
          
          // 清空当前消息
          this.setData({
            messages: [],
            currentChatId: null
          });
          
          wx.showToast({
            title: '新聊天已开启',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  },

  // 保存当前聊天
  saveCurrentChat() {
    if (this.data.messages.length === 0) {
      return;
    }

    const chatTitle = this.generateChatTitle();
    const chatData = {
      id: Date.now(),
      title: chatTitle,
      time: new Date().toLocaleString(),
      messages: this.data.messages
    };

    const historyChats = [...this.data.historyChats, chatData];
    
    this.setData({
      historyChats: historyChats
    });

    // 保存到本地存储
    wx.setStorageSync('chatHistory', historyChats);
  },

  // 生成聊天标题
  generateChatTitle() {
    const messages = this.data.messages;
    if (messages.length > 0) {
      const firstUserMessage = messages.find(msg => msg.type === 'user');
      if (firstUserMessage) {
        return firstUserMessage.content.length > 10 
          ? firstUserMessage.content.substring(0, 10) + '...'
          : firstUserMessage.content;
      }
    }
    return `聊天记录 ${new Date().toLocaleDateString()}`;
  },

  // 加载历史聊天
  loadHistoryChat(e) {
    const chatId = e.currentTarget.dataset.id;
    const historyChat = this.data.historyChats.find(chat => chat.id === chatId);
    
    if (historyChat) {
      this.setData({
        messages: historyChat.messages,
        currentChatId: chatId,
        showHistoryModal: false
      });
      
      // 滚动到底部
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  },



  onShareAppMessage() {
    return {
      title: 'AI医疗助手 - 智能健康咨询',
      path: '/pages/chat/chat'
    };
  }
}); 