/*
 * 月卡管理列表页脚本。
 * 负责查询、筛选、分页、全选、增删改入口、
 * 查看/编辑/续费弹窗和删除确认弹窗。
 */
(function () {
  'use strict';

  // 原始月卡数据，从 localStorage 读取。
  var allData = MonthCard.loadData();
  // 筛选后的数据，表格和分页都基于该数组展示。
  var filteredData = allData.slice();
  // 当前页码和每页展示条数。
  var currentPage = 1;
  var pageSize = 5;
  // 勾选记录的 id 集合，用于全选和批量删除。
  var selectedIds = {};
  // 当前编辑弹窗对应的记录 id 和模式：edit 或 renew。
  var editingId = null;
  var editingMode = 'edit';
  // 删除确认弹窗的回调函数，点击确认时执行。
  var pendingDeleteAction = null;

  // 根据 id 查找单条月卡记录，id 统一按字符串比较。
  function getRecord(id) {
    // 遍历原始数组，比较时统一转换为字符串避免类型差异。
    for (var i = 0; i < allData.length; i++) {
      if (String(allData[i].id) === String(id)) {
        return allData[i];
      }
    }
    return null;
  }

  // 读取查询筛选区的车主姓名、车牌号和状态条件。
  function getQueryCriteria() {
    // 文本输入去除首尾空格并转为小写，便于不区分大小写的包含匹配。
    return {
      ownerName: document.getElementById('queryOwnerName').value.trim().toLowerCase(),
      plateNo: document.getElementById('queryPlateNo').value.trim().toLowerCase(),
      status: document.getElementById('queryStatus').value
    };
  }

  /*
   * 使用 filter 对原始数据做条件筛选，并统一刷新页面。
   * resetPage 为 true 时查询后回到第一页。
   */
  function applyFilter(resetPage) {
    var criteria = getQueryCriteria();
    filteredData = allData.filter(function (record) {
      // 文本条件使用包含匹配，忽略大小写；状态条件精确匹配。
      var ownerMatch = !criteria.ownerName || String(record.ownerName || '').toLowerCase().indexOf(criteria.ownerName) !== -1;
      var plateMatch = !criteria.plateNo || String(record.plateNo || '').toLowerCase().indexOf(criteria.plateNo) !== -1;
      var statusMatch = criteria.status === '' || String(record.status) === criteria.status;
      return ownerMatch && plateMatch && statusMatch;
    });

    if (resetPage) {
      currentPage = 1;
    }
    renderAll();
  }

  // 统一调用表格、分页和结果统计渲染函数。
  function renderAll() {
    renderTable();
    renderPagination();
    renderResultCount();
  }

  function renderResultCount() {
    // 展示筛选后的总记录数。
    document.getElementById('resultCount').textContent = '共 ' + filteredData.length + ' 条记录';
  }

  /*
   * 根据当前页和每页条数切片生成表格行。
   * 所有用户输入值均经过 escapeHTML 处理，防止动态渲染注入。
   */
  function renderTable() {
    // 获取表格主体、空状态和全选框 DOM。
    var tableBody = document.getElementById('tableBody');
    var emptyState = document.getElementById('emptyState');
    var checkAll = document.getElementById('checkAll');
    var totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    // 删除或筛选后，如果当前页超出总页数，自动回退到最后一页。
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    // 根据当前页计算 slice 的起始下标。
    var start = (currentPage - 1) * pageSize;
    var pageData = filteredData.slice(start, start + pageSize);
    var html = '';

    pageData.forEach(function (record) {
      // 根据 id 恢复行复选框状态，并准备状态徽标样式。
      var id = String(record.id);
      var checked = selectedIds[id] ? 'checked' : '';
      var status = Number(record.status) === 1 ? '已过期' : '可用';
      var statusClass = Number(record.status) === 1 ? 'expired' : 'available';

      html += '<tr>';
      html += '<td><input type="checkbox" class="row-check" data-id="' + MonthCard.escapeHTML(id) + '" ' + checked + '></td>';
      html += '<td>' + MonthCard.escapeHTML(record.ownerName) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.phone) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.plateNo) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.carType) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.carColor) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.parkingSpace) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.monthCount) + ' 个月</td>';
      html += '<td class="money">¥' + MonthCard.formatMoney(record.amount) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.payMethod) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.startDate) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.endDate) + '</td>';
      html += '<td>' + MonthCard.escapeHTML(record.remainDay) + ' 天</td>';
      html += '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>';
      html += '<td><div class="table-actions">';
      html += '<button class="link-btn" type="button" data-action="view" data-id="' + MonthCard.escapeHTML(id) + '">查看</button>';
      html += '<button class="link-btn" type="button" data-action="edit" data-id="' + MonthCard.escapeHTML(id) + '">编辑</button>';
      html += '<button class="link-btn" type="button" data-action="renew" data-id="' + MonthCard.escapeHTML(id) + '">续费</button>';
      html += '<button class="link-btn danger" type="button" data-action="delete" data-id="' + MonthCard.escapeHTML(id) + '">删除</button>';
      html += '</div></td>';
      html += '</tr>';
    });

    // 写入当前页 HTML，并控制空状态显示。
    tableBody.innerHTML = html;
    emptyState.classList.toggle('hidden', pageData.length > 0);

    // 当前页所有行都被勾选时，表头全选框也变为勾选。
    if (checkAll) {
      checkAll.checked = pageData.length > 0 && pageData.every(function (record) {
        return Boolean(selectedIds[String(record.id)]);
      });
    }
  }

  // 更新分页页码和上一页、下一页按钮的禁用状态。
  function renderPagination() {
    // 计算总页数，并确保当前页不会超过总页数。
    var totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    // 更新页码文字，并根据是否位于边界禁用翻页按钮。
    document.getElementById('pageInfo').textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页';
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
  }

  // 清空编辑弹窗中的字段错误提示和错误边框。
  function clearErrors() {
    // 清除错误文字。
    document.querySelectorAll('[data-error-for]').forEach(function (element) {
      element.textContent = '';
    });
    // 清除输入框错误边框。
    document.querySelectorAll('#editForm .input, #editForm .select').forEach(function (element) {
      element.classList.remove('error');
    });
  }

  // 在指定编辑字段下方显示错误信息，并添加错误边框。
  function setFieldError(inputId, message) {
    // 找到输入框和对应错误提示容器。
    var input = document.getElementById(inputId);
    var errorElement = document.querySelector('[data-error-for="' + inputId + '"]');
    if (input) {
      input.classList.add('error');
    }
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  // 校验编辑弹窗表单的必填项、正则和日期，逐项返回提示。
  function validateEditForm() {
    // 每次校验前先清除上一次的错误提示。
    clearErrors();
    var valid = true;
    // 读取编辑弹窗中的当前值。
    var ownerName = document.getElementById('editOwnerName').value.trim();
    var phone = document.getElementById('editPhone').value.trim();
    var plateNo = document.getElementById('editPlateNo').value.trim();
    var carType = document.getElementById('editCarType').value.trim();
    var carColor = document.getElementById('editCarColor').value.trim();
    var parkingSpace = document.getElementById('editParkingSpace').value.trim();
    var monthCount = document.getElementById('editMonthCount').value.trim();
    var amount = document.getElementById('editAmount').value.trim();
    var payMethod = document.getElementById('editPayMethod').value;
    var startDate = document.getElementById('editStartDate').value;
    var endDate = document.getElementById('editEndDate').value;

    // 车主姓名为必填项。
    if (!ownerName) {
      setFieldError('editOwnerName', '车主姓名不能为空');
      valid = false;
    }
    // 手机号必填，且必须符合国内手机号规则。
    if (!phone) {
      setFieldError('editPhone', '手机号不能为空');
      valid = false;
    } else if (!MonthCard.PHONE_REGEX.test(phone)) {
      setFieldError('editPhone', '请输入正确的 11 位手机号');
      valid = false;
    }
    // 车牌号必填，且必须符合国内车牌规则。
    if (!plateNo) {
      setFieldError('editPlateNo', '车牌号不能为空');
      valid = false;
    } else if (!MonthCard.PLATE_REGEX.test(plateNo)) {
      setFieldError('editPlateNo', '请输入正确的国内车牌号');
      valid = false;
    }
    // 以下车辆信息字段均为必填项。
    if (!carType) {
      setFieldError('editCarType', '车型不能为空');
      valid = false;
    }
    if (!carColor) {
      setFieldError('editCarColor', '颜色不能为空');
      valid = false;
    }
    if (!parkingSpace) {
      setFieldError('editParkingSpace', '车位号不能为空');
      valid = false;
    }
    // 办理月数必须为正数。
    if (!monthCount || Number(monthCount) <= 0) {
      setFieldError('editMonthCount', '办理月数必须大于 0');
      valid = false;
    }
    // 缴费金额必须为正数。
    if (!amount || Number(amount) <= 0) {
      setFieldError('editAmount', '缴费金额必须大于 0');
      valid = false;
    }
    // 缴费方式必须选择。
    if (!payMethod) {
      setFieldError('editPayMethod', '请选择缴费方式');
      valid = false;
    }
    // 开始日期和结束日期均为必填项。
    if (!startDate) {
      setFieldError('editStartDate', '请选择开始日期');
      valid = false;
    }
    if (!endDate) {
      setFieldError('editEndDate', '请选择结束日期');
      valid = false;
    }
    // 结束日期不能早于开始日期。
    if (startDate && endDate && endDate < startDate) {
      setFieldError('editEndDate', '结束日期不能早于开始日期');
      valid = false;
    }

    return valid;
  }

  // 根据开始和结束日期更新编辑弹窗中的剩余天数和状态预览。
  function updateEditPreview() {
    // 日期不完整时显示占位符，不做错误计算。
    var startDate = document.getElementById('editStartDate').value;
    var endDate = document.getElementById('editEndDate').value;
    if (!startDate || !endDate) {
      document.getElementById('editRemainPreview').textContent = '--';
      document.getElementById('editStatusPreview').textContent = '--';
      return;
    }

    var computed = MonthCard.calcRemainAndStatus({ startDate: startDate, endDate: endDate });
    document.getElementById('editRemainPreview').textContent = computed.remainDay + ' 天';
    document.getElementById('editStatusPreview').textContent = MonthCard.statusText(computed.status);
  }

  // 打开指定 id 的弹窗遮罩。
  function openModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }

  // 关闭指定 id 的弹窗遮罩。
  function closeModal(id) {
    var modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // 打开只读查看弹窗，渲染单条月卡的全部字段信息。
  function openViewModal(id) {
    // 根据 id 获取记录，不存在则直接返回。
    var record = getRecord(id);
    if (!record) {
      return;
    }
    var status = Number(record.status) === 1 ? '已过期' : '可用';
    var statusClass = Number(record.status) === 1 ? 'expired' : 'available';
    var detail = document.getElementById('viewDetail');
    // 清空上次查看弹窗残留内容。
    detail.innerHTML = '';

    // 先定义需要展示的字段列表，再统一生成详情 DOM。
    var items = [
      { label: '车主姓名', value: record.ownerName },
      { label: '手机号', value: record.phone },
      { label: '车牌号', value: record.plateNo },
      { label: '车型', value: record.carType },
      { label: '颜色', value: record.carColor },
      { label: '车位号', value: record.parkingSpace },
      { label: '办理月数', value: record.monthCount + ' 个月' },
      { label: '缴费金额', value: '¥' + MonthCard.formatMoney(record.amount) },
      { label: '缴费方式', value: record.payMethod },
      { label: '开始日期', value: record.startDate },
      { label: '结束日期', value: record.endDate },
      { label: '剩余有效天数', value: record.remainDay + ' 天' }
    ];

    items.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'detail-item';
      div.innerHTML = '<span class="label">' + MonthCard.escapeHTML(item.label) + '</span>' +
        '<span class="value">' + MonthCard.escapeHTML(item.value) + '</span>';
      detail.appendChild(div);
    });

    // 状态字段使用独立徽标展示，并保留完整列宽。
    var statusDiv = document.createElement('div');
    statusDiv.className = 'detail-item full';
    statusDiv.innerHTML = '<span class="label">月卡状态</span>' +
      '<span class="status-badge ' + statusClass + '">' + status + '</span>';
    detail.appendChild(statusDiv);

    openModal('viewModal');
  }

  /*
   * 回填编辑弹窗，并在续费模式下锁定车辆信息字段。
   * 续费模式只允许修改办理月数、金额、缴费方式和结束日期。
   */
  function fillEditForm(record, mode) {
    document.getElementById('editOwnerName').value = record.ownerName || '';
    document.getElementById('editPhone').value = record.phone || '';
    document.getElementById('editPlateNo').value = record.plateNo || '';
    document.getElementById('editCarType').value = record.carType || '';
    document.getElementById('editCarColor').value = record.carColor || '';
    document.getElementById('editParkingSpace').value = record.parkingSpace || '';
    document.getElementById('editMonthCount').value = record.monthCount || '';
    document.getElementById('editAmount').value = record.amount || '';
    document.getElementById('editPayMethod').value = record.payMethod || '';
    document.getElementById('editStartDate').value = record.startDate || '';
    document.getElementById('editEndDate').value = record.endDate || '';

    var renewMode = mode === 'renew';
    // 续费时这些车辆信息字段只读，避免误改。
    var vehicleFields = ['editOwnerName', 'editPhone', 'editPlateNo', 'editCarType', 'editCarColor', 'editParkingSpace', 'editStartDate'];
    vehicleFields.forEach(function (inputId) {
      document.getElementById(inputId).readOnly = renewMode;
    });
    document.getElementById('editMonthCount').readOnly = false;
    document.getElementById('editAmount').readOnly = false;
    document.getElementById('editPayMethod').disabled = false;
    document.getElementById('editEndDate').readOnly = false;

    // 根据模式切换弹窗标题和缴费字段的可编辑状态。
    document.getElementById('editModalTitle').textContent = renewMode ? '月卡续费' : '编辑月卡';
    updateEditPreview();
  }

  // 打开编辑或续费弹窗并回填数据。
  function openEditModal(id, mode) {
    // 记录当前编辑对象和模式，并回填表单。
    var record = getRecord(id);
    if (!record) {
      return;
    }
    editingId = id;
    editingMode = mode || 'edit';
    clearErrors();
    fillEditForm(record, editingMode);
    openModal('editModal');
  }

  /*
   * 校验并保存编辑或续费弹窗中的修改。
   * 续费模式会保留原车辆信息，只更新缴费和有效期字段。
   */
  function saveEditModal() {
    var record = getRecord(editingId);
    if (!record) {
      return;
    }
    if (!validateEditForm()) {
      return;
    }

    var updated = {
      id: record.id,
      ownerName: document.getElementById('editOwnerName').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      plateNo: document.getElementById('editPlateNo').value.trim(),
      carType: document.getElementById('editCarType').value.trim(),
      carColor: document.getElementById('editCarColor').value.trim(),
      parkingSpace: document.getElementById('editParkingSpace').value.trim(),
      monthCount: Number(document.getElementById('editMonthCount').value),
      amount: Number(document.getElementById('editAmount').value),
      payMethod: document.getElementById('editPayMethod').value,
      startDate: document.getElementById('editStartDate').value,
      endDate: document.getElementById('editEndDate').value
    };

    // 续费模式下，车辆信息以原记录为准，避免被只读字段覆盖。
    if (editingMode === 'renew') {
      updated.ownerName = record.ownerName;
      updated.phone = record.phone;
      updated.plateNo = record.plateNo;
      updated.carType = record.carType;
      updated.carColor = record.carColor;
      updated.parkingSpace = record.parkingSpace;
      updated.startDate = record.startDate;
    }

    // 保存前重新计算剩余天数和状态。
    var computed = MonthCard.calcRemainAndStatus(updated);
    updated.remainDay = computed.remainDay;
    updated.status = computed.status;

    // 查找原记录下标并替换。
    var index = allData.findIndex(function (item) {
      return String(item.id) === String(editingId);
    });
    if (index !== -1) {
      allData[index] = updated;
    }

    MonthCard.saveData(allData);
    closeModal('editModal');
    applyFilter(true);
  }

  // 通过自定义弹窗确认后删除单条记录。
  function deleteOne(id) {
    var record = getRecord(id);
    if (!record) {
      return;
    }
    openDeleteConfirm(
      '删除月卡记录',
      '确认删除车主“' + record.ownerName + '”的月卡记录吗？',
      function () {
        allData = allData.filter(function (item) {
          return String(item.id) !== String(id);
        });
        delete selectedIds[String(id)];
        MonthCard.saveData(allData);
        applyFilter(true);
      }
    );
  }

  // 通过自定义弹窗确认后批量删除勾选记录。
  function deleteSelected() {
    var ids = Object.keys(selectedIds).filter(function (key) {
      return selectedIds[key];
    });
    if (ids.length === 0) {
      window.alert('请先勾选需要删除的月卡记录');
      return;
    }
    openDeleteConfirm(
      '批量删除月卡记录',
      '确认删除选中的 ' + ids.length + ' 条月卡记录吗？',
      function () {
        allData = allData.filter(function (record) {
          return ids.indexOf(String(record.id)) === -1;
        });
        selectedIds = {};
        MonthCard.saveData(allData);
        applyFilter(true);
      }
    );
  }

  // 打开删除确认弹窗，并暂存确认后需要执行的回调。
  function openDeleteConfirm(title, message, onConfirm) {
    pendingDeleteAction = onConfirm;
    document.getElementById('deleteModalTitle').textContent = title;
    document.getElementById('deleteModalMessage').textContent = message;
    openModal('deleteModal');
  }

  /*
   * 处理表格内复选框和操作按钮的事件委托。
   * 复选框只更新 selectedIds；操作按钮根据 data-action 分发。
   */
  function handleTableClick(event) {
    var target = event.target;
    if (target.classList.contains('row-check')) {
      var rowId = target.getAttribute('data-id');
      if (target.checked) {
        selectedIds[rowId] = true;
      } else {
        delete selectedIds[rowId];
      }
      renderTable();
      return;
    }

    // 点击按钮时找到最近的带 data-action 的父元素。
    var actionButton = target.closest('[data-action]');
    if (!actionButton) {
      return;
    }

    var action = actionButton.getAttribute('data-action');
    var id = actionButton.getAttribute('data-id');
    // 根据按钮动作执行对应业务。
    if (action === 'view') {
      openViewModal(id);
    } else if (action === 'edit') {
      openEditModal(id, 'edit');
    } else if (action === 'renew') {
      openEditModal(id, 'renew');
    } else if (action === 'delete') {
      deleteOne(id);
    }
  }

  // 绑定查询、分页、弹窗和删除相关事件。
  function bindEvents() {
    // 查询和重置。
    document.getElementById('queryBtn').addEventListener('click', function () {
      applyFilter(true);
    });
    document.getElementById('resetQueryBtn').addEventListener('click', function () {
      document.getElementById('queryOwnerName').value = '';
      document.getElementById('queryPlateNo').value = '';
      document.getElementById('queryStatus').value = '';
      filteredData = allData.slice();
      currentPage = 1;
      renderAll();
    });
    // 添加月卡跳转到新增页面。
    document.getElementById('addBtn').addEventListener('click', function () {
      window.location.href = 'addMonthCard.html';
    });
    // 批量删除按钮。
    document.getElementById('batchDeleteBtn').addEventListener('click', deleteSelected);

    // 表头全选：同步当前页所有行复选框。
    document.getElementById('checkAll').addEventListener('change', function (event) {
      var totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
      var start = (currentPage - 1) * pageSize;
      var pageData = filteredData.slice(start, start + pageSize);
      pageData.forEach(function (record) {
        var id = String(record.id);
        if (event.target.checked) {
          selectedIds[id] = true;
        } else {
          delete selectedIds[id];
        }
      });
      renderTable();
    });

    // 每页条数、上一页和下一页。
    document.getElementById('pageSizeSelect').addEventListener('change', function (event) {
      pageSize = Number(event.target.value) || 5;
      currentPage = 1;
      renderAll();
    });
    document.getElementById('prevPage').addEventListener('click', function () {
      if (currentPage > 1) {
        currentPage--;
        renderAll();
      }
    });
    document.getElementById('nextPage').addEventListener('click', function () {
      var totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
      if (currentPage < totalPages) {
        currentPage++;
        renderAll();
      }
    });

    // 表格事件委托。
    document.getElementById('tableBody').addEventListener('click', handleTableClick);

    // 编辑保存和删除确认按钮。
    document.getElementById('editSaveBtn').addEventListener('click', saveEditModal);
    document.getElementById('deleteConfirmBtn').addEventListener('click', function () {
      if (typeof pendingDeleteAction === 'function') {
        pendingDeleteAction();
      }
      pendingDeleteAction = null;
      closeModal('deleteModal');
    });
    document.getElementById('editStartDate').addEventListener('change', updateEditPreview);
    document.getElementById('editEndDate').addEventListener('change', updateEditPreview);

    // 所有带 data-close 的按钮统一关闭对应弹窗。
    document.querySelectorAll('[data-close]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeModal(button.getAttribute('data-close'));
      });
    });

    // 点击遮罩空白区域时关闭弹窗。
    document.querySelectorAll('.modal-mask').forEach(function (mask) {
      mask.addEventListener('click', function (event) {
        if (event.target === mask) {
          mask.classList.add('hidden');
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    applyFilter(true);
  });
})();
