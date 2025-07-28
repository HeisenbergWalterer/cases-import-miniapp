// 表单验证和交互功能
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('medicalForm');
    const submitBtn = document.querySelector('.btn-primary');
    
    // 表单提交处理
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (validateForm()) {
            submitForm();
        }
    });
    
    // 实时验证
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        field.addEventListener('input', function() {
            if (this.classList.contains('error')) {
                validateField(this);
            }
        });
    });
});

// 表单验证
function validateForm() {
    let isValid = true;
    const requiredFields = document.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// 单个字段验证
function validateField(field) {
    const formGroup = field.closest('.form-group');
    const errorMessage = formGroup.querySelector('.error-message') || createErrorMessage(formGroup);
    
    // 移除之前的错误状态
    formGroup.classList.remove('error');
    errorMessage.style.display = 'none';
    
    // 检查是否为空
    if (field.hasAttribute('required') && !field.value.trim()) {
        showError(formGroup, errorMessage, '此字段为必填项');
        return false;
    }
    
    // 年龄验证
    if (field.type === 'number' && field.name === 'age') {
        const age = parseInt(field.value);
        if (age < 0 || age > 120) {
            showError(formGroup, errorMessage, '年龄必须在0-120之间');
            return false;
        }
    }
    
    // 症状持续时间验证
    if (field.name === 'symptomDuration') {
        const duration = parseInt(field.value);
        if (duration < 0) {
            showError(formGroup, errorMessage, '时间不能为负数');
            return false;
        }
    }
    
    return true;
}

// 创建错误消息元素
function createErrorMessage(formGroup) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    formGroup.appendChild(errorDiv);
    return errorDiv;
}

// 显示错误
function showError(formGroup, errorMessage, message) {
    formGroup.classList.add('error');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// 提交表单
function submitForm() {
    const form = document.getElementById('medicalForm');
    const submitBtn = document.querySelector('.btn-primary');
    
    // 显示加载状态
    form.classList.add('loading');
    submitBtn.textContent = '提交中...';
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 模拟提交过程
    setTimeout(() => {
        console.log('提交的数据:', formData);
        
        // 显示成功消息
        showSuccessMessage();
        
        // 恢复按钮状态
        form.classList.remove('loading');
        submitBtn.textContent = '提交表单';
        
        // 可以在这里添加实际的提交逻辑
        // 例如：发送到服务器
        // submitToServer(formData);
        
    }, 2000);
}

// 收集表单数据
function collectFormData() {
    const form = document.getElementById('medicalForm');
    const formData = new FormData(form);
    const data = {};
    
    // 基本信息
    data.patientName = formData.get('patientName');
    data.gender = formData.get('gender');
    data.age = formData.get('age');
    data.hospitalId = formData.get('hospitalId');
    data.pathologyId = formData.get('pathologyId');
    
    // 症状信息
    data.symptomDuration = formData.get('symptomDuration');
    data.durationUnit = formData.get('durationUnit');
    
    // 合并疾病
    data.comorbidities = formData.getAll('comorbidities');
    
    // 既往病史
    data.pastHistory = formData.getAll('pastHistory');
    
    // 影像学报告
    data.ultrasoundReport = formData.get('ultrasoundReport');
    data.ultrasoundConclusion = formData.get('ultrasoundConclusion');
    
    // 病理报告
    data.pathologyReport = formData.get('pathologyReport');
    data.immunohistochemistry = formData.get('immunohistochemistry');
    
    // 添加时间戳
    data.submittedAt = new Date().toISOString();
    
    return data;
}

// 显示成功消息
function showSuccessMessage() {
    // 检查是否已存在成功消息
    let successMessage = document.querySelector('.success-message');
    
    if (!successMessage) {
        successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = '✓ 表单提交成功！病例记录已保存。';
        
        const form = document.getElementById('medicalForm');
        form.parentNode.insertBefore(successMessage, form);
    }
    
    successMessage.classList.add('show');
    
    // 3秒后隐藏消息
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// 清空表单
function clearForm() {
    if (confirm('确定要清空所有输入的内容吗？')) {
        const form = document.getElementById('medicalForm');
        form.reset();
        
        // 移除所有错误状态
        const errorGroups = form.querySelectorAll('.form-group.error');
        errorGroups.forEach(group => {
            group.classList.remove('error');
            const errorMessage = group.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.style.display = 'none';
            }
        });
        
        // 隐藏成功消息
        const successMessage = document.querySelector('.success-message');
        if (successMessage) {
            successMessage.classList.remove('show');
        }
    }
}

// 自动保存功能（可选）
function autoSave() {
    const formData = collectFormData();
    localStorage.setItem('medicalFormDraft', JSON.stringify(formData));
    console.log('表单已自动保存');
}

// 加载草稿（可选）
function loadDraft() {
    const draft = localStorage.getItem('medicalFormDraft');
    if (draft && confirm('发现未完成的表单草稿，是否要恢复？')) {
        const data = JSON.parse(draft);
        populateForm(data);
    }
}

// 填充表单数据
function populateForm(data) {
    const form = document.getElementById('medicalForm');
    
    // 填充基本信息
    if (data.patientName) form.patientName.value = data.patientName;
    if (data.gender) form.gender.value = data.gender;
    if (data.age) form.age.value = data.age;
    if (data.hospitalId) form.hospitalId.value = data.hospitalId;
    if (data.pathologyId) form.pathologyId.value = data.pathologyId;
    
    // 填充症状信息
    if (data.symptomDuration) form.symptomDuration.value = data.symptomDuration;
    if (data.durationUnit) form.durationUnit.value = data.durationUnit;
    
    // 填充复选框
    if (data.comorbidities) {
        data.comorbidities.forEach(value => {
            const checkbox = form.querySelector(`input[name="comorbidities"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    if (data.pastHistory) {
        data.pastHistory.forEach(value => {
            const checkbox = form.querySelector(`input[name="pastHistory"][value="${value}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }
    
    // 填充文本域
    if (data.ultrasoundReport) form.ultrasoundReport.value = data.ultrasoundReport;
    if (data.ultrasoundConclusion) form.ultrasoundConclusion.value = data.ultrasoundConclusion;
    if (data.pathologyReport) form.pathologyReport.value = data.pathologyReport;
    if (data.immunohistochemistry) form.immunohistochemistry.value = data.immunohistochemistry;
}

// 页面加载时检查草稿
document.addEventListener('DOMContentLoaded', function() {
    // 延迟加载草稿，让页面先渲染完成
    setTimeout(loadDraft, 500);
    
    // 每30秒自动保存一次
    setInterval(autoSave, 30000);
});

// 页面离开前保存草稿
window.addEventListener('beforeunload', function() {
    autoSave();
});

// 导出数据功能
function exportData() {
    const data = collectFormData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `病例记录_${data.patientName || '未命名'}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// 打印功能
function printForm() {
    window.print();
}
