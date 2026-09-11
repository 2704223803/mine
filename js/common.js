/*
 * 月卡后台管理系统公共脚本。
 * 本文件负责三页共用的数据读取、保存、格式化、日期计算、
 * 正则校验、HTML 转义、公共布局初始化和滚动动画。
 */
(function () {
  'use strict';

  // 统一本地存储 key，三个页面通过该 key 共享同一份月卡数据。
  var STORAGE_KEY = 'monthCardData';
  // 手机号校验：1 开头，第二位为 3 到 9，后接 9 位数字。
  var PHONE_REGEX = /^1[3-9]\d{9}$/;
  // 国内车牌校验：省份简称 + 发牌机关代码 + 5 到 6 位字符，
  // 允许常规字母数字以及挂、学、警、港、澳等特殊结尾。
  var PLATE_REGEX = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/;

  // 将数字补足为两位字符串，用于生成 YYYY-MM-DD 日期。
  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  // 将 Date 对象转换为本地日期字符串，避免时区导致日期偏移。
  function toDateString(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  // 在指定日期基础上增加天数，返回一个新的 Date 对象。
  function addDays(date, days) {
    var result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }

  /*
   * 根据结束日期和当前时间计算剩余天数及月卡状态。
   * record 至少需要 endDate 字段。
   * now 参数用于测试时注入固定时间，缺省时使用系统当前时间。
   * remainDay 为剩余天数，负数表示已经过期；status 1 表示已过期。
   */
  function calcRemainAndStatus(record, now) {
    var current = now || new Date();
    var end = parseEndOfDay(record.endDate);
    var remainDay;
    var status;

    if (isNaN(end.getTime())) {
      remainDay = '--';
      status = 1;
    } else {
      remainDay = Math.ceil((end.getTime() - current.getTime()) / 86400000);
      status = remainDay < 0 ? 1 : 0;
    }

    return { remainDay: remainDay, status: status };
  }

  // 将 YYYY-MM-DD 解析为当天 23:59:59.999，保证结束当天仍算有效。
  function parseEndOfDay(dateString) {
    if (!dateString) {
      return new Date(NaN);
    }
    var parts = String(dateString).split('-');
    if (parts.length !== 3) {
      return new Date(NaN);
    }
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  /*
   * 构造一条默认模拟月卡数据。
   * startOffset 和 endOffset 分别表示相对今天偏移的天数，
   * 这样可以生成同时包含可用和已过期状态的示例记录。
   */
  function buildMockRecord(index, ownerName, phone, plateNo, carType, carColor, parkingSpace, monthCount, amount, payMethod, startOffset, endOffset) {
    var now = new Date();
    var startDate = toDateString(addDays(now, startOffset));
    var endDate = toDateString(addDays(now, endOffset));
    var record = {
      id: Date.now() + index,
      ownerName: ownerName,
      phone: phone,
      plateNo: plateNo,
      carType: carType,
      carColor: carColor,
      parkingSpace: parkingSpace,
      monthCount: monthCount,
      amount: amount,
      payMethod: payMethod,
      startDate: startDate,
      endDate: endDate,
      remainDay: '--',
      status: 1
    };
    var computed = calcRemainAndStatus(record, now);
    record.remainDay = computed.remainDay;
    record.status = computed.status;
    return record;
  }

  // 返回 6 条覆盖不同状态、车型和缴费方式的默认数据。
  function buildDefaultData() {
    return [
      buildMockRecord(1, '张伟', '13812345678', '京A12345', '轿车', '白色', 'A001', 6, 1800, '微信', -80, 100),
      buildMockRecord(2, '李娜', '13998765432', '沪B6F888', 'SUV', '黑色', 'B012', 12, 3600, '支付宝', -10, 355),
      buildMockRecord(3, '王强', '13655556666', '粤C123D6', '轿车', '银色', 'C023', 3, 900, '银行卡', -30, 60),
      buildMockRecord(4, '赵敏', '13544443333', '苏D88888', '新能源轿车', '蓝色', 'D034', 6, 1500, '微信', 3, 183),
      buildMockRecord(5, '陈杰', '13711112222', '浙E5F6A7', 'MPV', '灰色', 'E045', 12, 3200, '现金', 20, 385),
      buildMockRecord(6, '刘洋', '15866667777', '鲁F12345', '轿车', '红色', 'F056', 1, 300, '支付宝', -5, 25)
    ];
  }

  /*
   * 读取本地月卡数据。
   * 优先解析 localStorage；如果不存在、格式错误或存储不可用，
   * 则创建默认模拟数据并写回，确保页面始终有数据可渲染。
   */
  function loadData() {
    try {
      // 尝试读取并解析 localStorage 中的月卡数组。
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      // 存储不可用时继续使用模拟数据。
    }

    // 没有有效数据时初始化并保存默认模拟数据。
    var mockData = buildDefaultData();
    saveData(mockData);
    return mockData;
  }

  // 将月卡数组序列化后写入 localStorage，写入失败时静默忽略。
  function saveData(list) {
    try {
      // localStorage 只能存字符串，因此先序列化再写入。
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list || []));
    } catch (error) {
      // 忽略无痕模式等存储异常。
    }
  }

  // 将数字金额格式化为带千分位和两位小数的中文本地化字符串。
  function formatMoney(value) {
    var number = Number(value);
    if (isNaN(number)) {
      number = 0;
    }
    return number.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // 从当前 URL 查询参数中读取指定字段，用于区分新增和编辑模式。
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // 将用户输入转为纯文本 HTML 实体，避免动态表格渲染时发生注入。
  function escapeHTML(value) {
    var div = document.createElement('div');
    div.textContent = value === undefined || value === null ? '' : String(value);
    return div.innerHTML;
  }

  // 将状态数字转换为界面文案。
  function statusText(status) {
    return Number(status) === 1 ? '已过期' : '可用';
  }

  /*
   * 初始化三页公共布局。
   * 根据当前页面文件名设置菜单高亮，并绑定侧边栏折叠、
   * 月卡管理子菜单展开和收起事件。
   */
  function initCommonLayout() {
    // 从路径中提取当前页面文件名，用于菜单高亮。
    var path = window.location.pathname.split('/').pop();
    if (!path) {
      path = 'index.html';
    }

    // 遍历所有带 data-page 的菜单项，匹配当前页面并添加 active。
    var pageLinks = document.querySelectorAll('[data-page]');
    pageLinks.forEach(function (link) {
      var target = link.getAttribute('data-page');
      var href = link.getAttribute('href') || '';
      var linkName = href.split('/').pop().split('?')[0];
      var isActive = linkName === path;
      link.classList.toggle('active', isActive);
      if (isActive && link.closest('.submenu')) {
        link.closest('.submenu').classList.add('open');
      }
    });

    // 绑定侧边栏折叠按钮。
    var toggleButton = document.getElementById('sidebarToggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', function () {
        document.body.classList.toggle('sidebar-collapsed');
      });
    }

    // 绑定月卡管理父菜单，点击时展开或收起子菜单。
    var menuParents = document.querySelectorAll('.menu-parent');
    menuParents.forEach(function (parent) {
      parent.addEventListener('click', function () {
        parent.classList.toggle('open');
        var submenu = parent.nextElementSibling;
        if (submenu && submenu.classList.contains('submenu')) {
          submenu.classList.toggle('open');
        }
      });
    });

  }

  /*
   * 为主页面卡片添加滚动浮现效果。
   * 使用 IntersectionObserver 检测元素进入视口，避免监听 scroll；
   * 同时兼容不支持该 API 或偏好减少动效的浏览器。
   */
  function initRevealAnimations() {
    // 选择需要动画的静态卡片，并添加初始隐藏状态。
    var revealTargets = document.querySelectorAll('.stat-card, .card, .quick-item');
    revealTargets.forEach(function (element) {
      element.classList.add('reveal');
    });

    // 用户偏好减少动效时直接显示，不执行动画。
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealTargets.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

    // 不支持 IntersectionObserver 时直接显示，保证内容可读。
    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach(function (element) {
        element.classList.add('is-visible');
      });
      return;
    }

    // 进入视口后移除隐藏状态，并停止观察该元素。
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealTargets.forEach(function (element) {
      observer.observe(element);
    });
  }

  initRevealAnimations();

  // 暴露公共 API 给各页面脚本调用。
  window.MonthCard = {
    STORAGE_KEY: STORAGE_KEY,
    PHONE_REGEX: PHONE_REGEX,
    PLATE_REGEX: PLATE_REGEX,
    loadData: loadData,
    saveData: saveData,
    formatMoney: formatMoney,
    getParam: getParam,
    escapeHTML: escapeHTML,
    calcRemainAndStatus: calcRemainAndStatus,
    statusText: statusText,
    toDateString: toDateString,
    addDays: addDays
  };

  document.addEventListener('DOMContentLoaded', initCommonLayout);
})();
