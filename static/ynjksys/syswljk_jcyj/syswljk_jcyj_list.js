(function (global) {
  "use strict";
  var S = global.SyswljkWarningService;
  var PAGE_SIZE = 10;
  var data = { devices: [], alarms: [], rules: [], pushes: [] };
  var filtered = [];
  var page = 1;

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function val(id) { return el(id).value.trim(); }
  function title(v) { return ' title="' + esc(v || "--") + '"'; }
  function toast(message) {
    var node = el("toast");
    node.textContent = message;
    node.classList.remove("is-hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.classList.add("is-hidden"); }, 2200);
  }
  function tag(v) {
    var kind = v === "已处理" || v === "已解除" ? "success" : v === "紧急" || v === "已失效" ? "danger" : v === "重要" || v === "待确认" ? "warning" : "muted";
    return '<span class="tag tag-' + kind + '">' + esc(v) + "</span>";
  }
  function displayValue(alarm) {
    return alarm.value === "" ? "--" : alarm.value + (alarm.unit ? " " + alarm.unit : "");
  }
  function unique(items, key) {
    var seen = {};
    return items.filter(function (item) {
      var value = item[key];
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function initOptions() {
    el("alarmDevice").innerHTML = '<option value="">全部设备</option>' + data.devices.map(function (device) {
      return '<option value="' + esc(device.id) + '">' + esc(device.area + "（" + device.name + "）") + "</option>";
    }).join("");
    el("alarmMetric").innerHTML = '<option value="">全部指标</option>' + unique(data.alarms, "metricCode").map(function (alarm) {
      return '<option value="' + esc(alarm.metricCode) + '">' + esc(alarm.metric) + "</option>";
    }).join("");
  }

  function renderMetrics() {
    el("metricTotal").textContent = data.alarms.length;
    el("metricDevices").textContent = data.devices.length;
    el("metricMetrics").textContent = unique(data.alarms, "metricCode").length;
    el("metricPending").textContent = data.alarms.filter(function (x) { return x.status === "待确认"; }).length;
    el("metricHandled").textContent = data.alarms.filter(function (x) { return x.status === "已处理"; }).length;
    el("metricInvalid").textContent = data.alarms.filter(function (x) { return x.status === "已失效"; }).length;
  }

  function applyFilter() {
    var start = val("alarmStart");
    var end = val("alarmEnd");
    var device = val("alarmDevice");
    var metric = val("alarmMetric");
    var level = val("alarmLevel");
    var status = val("alarmStatus");
    filtered = data.alarms.filter(function (alarm) {
      var day = alarm.time.slice(0, 10);
      return (!start || day >= start) && (!end || day <= end) && (!device || alarm.deviceId === device) && (!metric || alarm.metricCode === metric) && (!level || alarm.level === level) && (!status || alarm.status === status);
    });
    page = 1;
    render();
  }

  function renderPager() {
    var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    var from = Math.max(1, page - 2);
    var to = Math.min(totalPages, from + 4);
    from = Math.max(1, to - 4);
    var html = '<button data-page-dir="-1" ' + (page <= 1 ? "disabled" : "") + '>‹</button>';
    for (var i = from; i <= to; i++) html += '<button data-page="' + i + '" class="' + (i === page ? "is-current" : "") + '">' + i + "</button>";
    html += '<button data-page-dir="1" ' + (page >= totalPages ? "disabled" : "") + '>›</button><span>共 ' + totalPages + " 页，" + filtered.length + " 条</span>";
    el("alarmPager").innerHTML = html;
  }

  function render() {
    var rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    el("alarmRows").innerHTML = rows.map(function (alarm, index) {
      return '<tr><td><button class="action" data-view="' + esc(alarm.id) + '">查看</button></td><td>' + ((page - 1) * PAGE_SIZE + index + 1) + "</td><td>" + esc(alarm.time) + "</td><td>" + tag(alarm.level) + "</td><td" + title(alarm.deviceCode) + ">" + esc(alarm.deviceCode) + "</td><td" + title(alarm.deviceName) + ">" + esc(alarm.deviceName) + "</td><td" + title(alarm.location) + ">" + esc(alarm.location) + "</td><td>" + esc(alarm.metric) + "</td><td>" + esc(displayValue(alarm)) + "</td><td" + title(alarm.condition) + ">" + esc(alarm.condition) + "</td><td>" + tag(alarm.status) + "</td></tr>";
    }).join("");
    el("alarmSummary").textContent = "（当前查询 " + filtered.length + " 条）";
    el("alarmEmpty").classList.toggle("is-hidden", filtered.length > 0);
    renderPager();
    renderMetrics();
  }

  function openDetail(id) {
    var alarm = data.alarms.find(function (item) { return item.id === id; });
    if (!alarm) return;
    var items = [
      ["预警编号", alarm.id], ["报警类型", alarm.type], ["预警时间", alarm.time],
      ["设备编号", alarm.deviceCode], ["设备名称", alarm.deviceName], ["监测位置", alarm.location],
      ["监测指标", alarm.metric], ["监测值", displayValue(alarm)], ["预警级别", alarm.level],
      ["处理状态", alarm.status], ["触发条件", alarm.condition, "full"]
    ];
    el("modalTitle").textContent = "查看预警详情";
    el("modalBody").innerHTML = '<div class="detail-grid">' + items.map(function (item) {
      return '<div class="detail-item ' + (item[2] || "") + '"><span>' + esc(item[0]) + "</span><strong>" + esc(item[1] || "--") + "</strong></div>";
    }).join("") + "</div>";
    el("modalSubmit").textContent = "关闭";
    el("modal").classList.remove("is-hidden");
  }
  function closeModal() { el("modal").classList.add("is-hidden"); }

  function bind() {
    document.querySelector(".page-tabs").onclick = function (event) {
      var tab = event.target.dataset.tab;
      if (!tab) return;
      document.querySelectorAll(".page-tab").forEach(function (node) { node.classList.toggle("is-active", node.dataset.tab === tab); });
      document.querySelectorAll(".tab-panel").forEach(function (node) { node.classList.add("is-hidden"); });
      el(tab + "Panel").classList.remove("is-hidden");
    };
    document.body.onclick = function (event) {
      var node = event.target;
      if (node.dataset.close !== undefined) { closeModal(); return; }
      if (node.dataset.view) { openDetail(node.dataset.view); return; }
      if (node.dataset.search === "alarm") { applyFilter(); return; }
      if (node.dataset.reset === "alarm") {
        el("alarmPanel").querySelectorAll("input,select").forEach(function (input) { input.value = ""; });
        applyFilter();
        return;
      }
      if (node.dataset.page) { page = Number(node.dataset.page); render(); return; }
      if (node.dataset.pageDir) {
        page = Math.max(1, Math.min(Math.ceil(filtered.length / PAGE_SIZE) || 1, page + Number(node.dataset.pageDir)));
        render();
      }
    };
    el("modalForm").onsubmit = function (event) { event.preventDefault(); closeModal(); };
  }

  function init() {
    bind();
    S.loadAll().then(function (result) {
      data = result;
      initOptions();
      el("ruleSummary").textContent = "（当前查询 0 条）";
      el("pushSummary").textContent = "（当前查询 0 条）";
      el("ruleEmpty").classList.remove("is-hidden");
      el("pushEmpty").classList.remove("is-hidden");
      applyFilter();
    }).catch(function () { toast("数据加载失败，请稍后重试"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
