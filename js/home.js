/*
 * 工作台首页渲染脚本。
 * 页面加载后读取共享月卡数据，渲染四张统计卡片。
 */
(function () {
  'use strict';

  /*
   * 渲染首页四张统计卡片。
   * 月卡车辆总数从 localStorage 中的数组长度动态计算，
   * 年度累计收费、入驻企业总数和一体杆总数使用模拟固定值。
   */
  function renderHomeStat() {
    var data = MonthCard.loadData();
    var vehicleElement = document.getElementById('statVehicle');
    var incomeElement = document.getElementById('statIncome');
    var companyElement = document.getElementById('statCompany');
    var barrierElement = document.getElementById('statBarrier');

    // 月卡车辆总数，数据变化后刷新首页即可同步。
    if (vehicleElement) {
      vehicleElement.textContent = data.length;
    }
    // 年度累计收费使用固定模拟金额，并通过 formatMoney 格式化。
    if (incomeElement) {
      incomeElement.textContent = '¥' + MonthCard.formatMoney(1286000);
    }
    // 入驻企业总数和一体杆总数为实验预设模拟值。
    if (companyElement) {
      companyElement.textContent = 86;
    }
    if (barrierElement) {
      barrierElement.textContent = 24;
    }
  }

  // 页面加载完成后立即执行统计渲染。
  document.addEventListener('DOMContentLoaded', function () {
    renderHomeStat();
  });
})();
