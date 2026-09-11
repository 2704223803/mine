/*
 * 增加月卡页面脚本。
 * 同时承担新增和编辑两种模式，通过 URL 参数 id 区分。
 */
(function () {
  'use strict';

  // 读取共享数据源，并根据 URL 中的 id 判断新增或编辑模式。
  var monthCardData = MonthCard.loadData();
  var editId = MonthCard.getParam('id');
  var isEditMode = Boolean(editId);
  // 编辑模式时记录目标数据在数组中的下标，便于保存时替换。
  var editIndex = -1;

  // 清空所有表单字段下的校验错误提示，避免上一次错误残留。
  function clearErrors() {
    document.querySelectorAll('[data-error-for]').forEach(function (element) {
      element.textContent = '';
    });
    document.querySelectorAll('#monthCardForm .input, #monthCardForm .select').forEach(function (element) {
      element.classList.remove('error');
    });
  }

  // 在指定输入框下方显示校验错误，并给输入框添加红色边框。
  function setFieldError(inputId, message) {
    var input = document.getElementById(inputId);
    var errorElement = document.querySelector('[data-error-for="' + inputId + '"]');
    if (input) {
      input.classList.add('error');
    }
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /*
   * 根据开始和结束日期实时更新剩余天数及状态预览。
   * 日期不完整时显示占位符，避免给用户错误结果。
   */
  function updatePreview() {
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;
    if (!startDate || !endDate) {
      document.getElementById('remainDayPreview').textContent = '--';
      document.getElementById('statusPreview').textContent = '--';
      return;
    }

    var computed = MonthCard.calcRemainAndStatus({ startDate: startDate, endDate: endDate });
    document.getElementById('remainDayPreview').textContent = computed.remainDay + ' 天';
    document.getElementById('statusPreview').textContent = MonthCard.statusText(computed.status);
  }

  // 将指定月卡对象逐字段回填到表单中，用于编辑模式。
  function fillForm(record) {
    document.getElementById('ownerName').value = record.ownerName || '';
    document.getElementById('phone').value = record.phone || '';
    document.getElementById('plateNo').value = record.plateNo || '';
    document.getElementById('carType').value = record.carType || '';
    document.getElementById('carColor').value = record.carColor || '';
    document.getElementById('parkingSpace').value = record.parkingSpace || '';
    document.getElementById('monthCount').value = record.monthCount || '';
    document.getElementById('amount').value = record.amount || '';
    document.getElementById('payMethod').value = record.payMethod || '';
    document.getElementById('startDate').value = record.startDate || '';
    document.getElementById('endDate').value = record.endDate || '';
    updatePreview();
  }

  /*
   * 根据是否携带 id 初始化页面标题和编辑回填。
   * 新增模式保持空白表单，编辑模式查找目标记录并填充。
   */
  function initMode() {
    if (!isEditMode) {
      document.getElementById('pageTitle').textContent = '增加月卡';
      document.getElementById('pageSubtitle').textContent = '填写车辆与缴费信息，保存后写入本地存储';
      document.getElementById('pageTopbarTitle').textContent = '增加月卡';
      return;
    }

    document.getElementById('pageTitle').textContent = '编辑月卡';
    document.getElementById('pageSubtitle').textContent = '修改月卡信息，保存后同步到本地存储';
    document.getElementById('pageTopbarTitle').textContent = '编辑月卡';

    for (var i = 0; i < monthCardData.length; i++) {
      if (String(monthCardData[i].id) === String(editId)) {
        editIndex = i;
        fillForm(monthCardData[i]);
        break;
      }
    }

    if (editIndex === -1) {
      window.alert('未找到需要编辑的月卡记录');
    }
  }

  /*
   * 校验所有必填项、正则格式、金额和日期合法性。
   * 校验失败时逐项显示错误，并返回 false 阻止保存。
   */
  function validateForm() {
    clearErrors();
    var valid = true;
    var ownerName = document.getElementById('ownerName').value.trim();
    var phone = document.getElementById('phone').value.trim();
    var plateNo = document.getElementById('plateNo').value.trim();
    var carType = document.getElementById('carType').value.trim();
    var carColor = document.getElementById('carColor').value.trim();
    var parkingSpace = document.getElementById('parkingSpace').value.trim();
    var monthCount = document.getElementById('monthCount').value.trim();
    var amount = document.getElementById('amount').value.trim();
    var payMethod = document.getElementById('payMethod').value;
    var startDate = document.getElementById('startDate').value;
    var endDate = document.getElementById('endDate').value;

    // 车主姓名为必填项。
    if (!ownerName) {
      setFieldError('ownerName', '车主姓名不能为空');
      valid = false;
    }
    // 手机号必填，且必须符合国内手机号规则。
    if (!phone) {
      setFieldError('phone', '手机号不能为空');
      valid = false;
    } else if (!MonthCard.PHONE_REGEX.test(phone)) {
      setFieldError('phone', '请输入正确的 11 位手机号');
      valid = false;
    }
    // 车牌号必填，且必须符合国内车牌规则。
    if (!plateNo) {
      setFieldError('plateNo', '车牌号不能为空');
      valid = false;
    } else if (!MonthCard.PLATE_REGEX.test(plateNo)) {
      setFieldError('plateNo', '请输入正确的国内车牌号');
      valid = false;
    }
    // 以下车辆信息和缴费字段均为必填项。
    if (!carType) {
      setFieldError('carType', '车型不能为空');
      valid = false;
    }
    if (!carColor) {
      setFieldError('carColor', '颜色不能为空');
      valid = false;
    }
    if (!parkingSpace) {
      setFieldError('parkingSpace', '车位号不能为空');
      valid = false;
    }
    // 办理月数必须为正数。
    if (!monthCount || Number(monthCount) <= 0) {
      setFieldError('monthCount', '办理月数必须大于 0');
      valid = false;
    }
    // 缴费金额必须为正数。
    if (!amount || Number(amount) <= 0) {
      setFieldError('amount', '缴费金额必须大于 0');
      valid = false;
    }
    // 缴费方式必须选择。
    if (!payMethod) {
      setFieldError('payMethod', '请选择缴费方式');
      valid = false;
    }
    // 开始日期和结束日期均为必填项。
    if (!startDate) {
      setFieldError('startDate', '请选择开始日期');
      valid = false;
    }
    if (!endDate) {
      setFieldError('endDate', '请选择结束日期');
      valid = false;
    }
    // 结束日期不能早于开始日期。
    if (startDate && endDate && endDate < startDate) {
      setFieldError('endDate', '结束日期不能早于开始日期');
      valid = false;
    }

    return valid;
  }

  // 收集并标准化表单输入值，供保存逻辑使用。
  function collectForm() {
    return {
      ownerName: document.getElementById('ownerName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      plateNo: document.getElementById('plateNo').value.trim(),
      carType: document.getElementById('carType').value.trim(),
      carColor: document.getElementById('carColor').value.trim(),
      parkingSpace: document.getElementById('parkingSpace').value.trim(),
      monthCount: Number(document.getElementById('monthCount').value),
      amount: Number(document.getElementById('amount').value),
      payMethod: document.getElementById('payMethod').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value
    };
  }

  /*
   * 保存新增或编辑结果。
   * 校验通过后计算剩余天数和状态；新增时 push，编辑时替换；
   * 最后写入 localStorage 并跳转回列表页。
   */
  function handleSave() {
    if (!validateForm()) {
      return;
    }

    var record = collectForm();
    var computed = MonthCard.calcRemainAndStatus(record);
    record.remainDay = computed.remainDay;
    record.status = computed.status;

    // 编辑模式保留原 id 并替换原位置，新增模式生成新 id 并追加。
    if (isEditMode && editIndex !== -1) {
      record.id = monthCardData[editIndex].id;
      monthCardData[editIndex] = record;
    } else {
      record.id = Date.now();
      monthCardData.push(record);
    }

    MonthCard.saveData(monthCardData);
    window.alert('保存成功');
    window.location.href = 'monthCard.html';
  }

  // 重置表单内容、校验错误和日期预览。
  function handleReset() {
    document.getElementById('monthCardForm').reset();
    clearErrors();
    updatePreview();
  }

  // 绑定返回、重置、保存和日期变化时的预览联动事件。
  function bindEvents() {
    document.getElementById('backBtn').addEventListener('click', function () {
      window.location.href = 'monthCard.html';
    });
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('saveBtn').addEventListener('click', handleSave);
    document.getElementById('startDate').addEventListener('change', updatePreview);
    document.getElementById('endDate').addEventListener('change', updatePreview);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMode();
    bindEvents();
  });
})();
