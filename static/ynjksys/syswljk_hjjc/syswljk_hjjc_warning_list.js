(function () {
  "use strict";
  var S = window.SyswljkWarningService;
  var PAGE_SIZE = 10;
  var alarms = [];
  var rows = [];
  var page = 1;

  function el(id) { return document.getElementById(id); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
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
  function option(select, value, text) {
    var node = document.createElement("option");
    node.value = value;
    node.textContent = text;
    select.appendChild(node);
  }
  function toast(message) {
    el("toast").textContent = message;
    el("toast").classList.remove("is-hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el("toast").classList.add("is-hidden"); }, 2200);
  }
  function tag(v) {
    var kind = v === "已处理" ? "success" : v === "待确认" || v === "紧急" ? "danger" : v === "重要" ? "warning" : "muted";
    return '<span class="tag tag-' + kind + '">' + esc(v) + "</span>";
  }
  function displayValue(alarm) {
    return alarm.value === "" ? "--" : alarm.value + (alarm.unit ? " " + alarm.unit : "");
  }

  function initOptions() {
    unique(alarms, "dept").forEach(function (alarm) { option(el("qDept"), alarm.dept, alarm.dept); });
    unique(alarms, "deviceId").forEach(function (alarm) { option(el("qObject"), alarm.deviceId, alarm.location); });
    unique(alarms, "metricCode").forEach(function (alarm) { option(el("qProject"), alarm.metricCode, alarm.metric); });
  }

  function metrics() {
    el("mTotal").textContent = alarms.length;
    el("mObjects").textContent = unique(alarms, "deviceId").length;
    el("mProjects").textContent = unique(alarms, "metricCode").length;
    el("mPending").textContent = alarms.filter(function (x) { return x.status === "待确认"; }).length;
    el("mHandled").textContent = alarms.filter(function (x) { return x.status === "已处理"; }).length;
  }

  function filter() {
    var dept = el("qDept").value;
    var objectId = el("qObject").value;
    var project = el("qProject").value;
    var level = el("qLevel").value;
    var status = el("qStatus").value;
    rows = alarms.filter(function (alarm) {
      return (!dept || alarm.dept === dept) && (!objectId || alarm.deviceId === objectId) && (!project || alarm.metricCode === project) && (!level || alarm.level === level) && (!status || alarm.status === status);
    });
    page = 1;
    render();
  }

  function renderPager() {
    var totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    var from = Math.max(1, page - 2);
    var to = Math.min(totalPages, from + 4);
    from = Math.max(1, to - 4);
    var html = '<button data-page-dir="-1" ' + (page <= 1 ? "disabled" : "") + '>‹</button>';
    for (var i = from; i <= to; i++) html += '<button data-page="' + i + '" class="' + (i === page ? "is-current" : "") + '">' + i + "</button>";
    html += '<button data-page-dir="1" ' + (page >= totalPages ? "disabled" : "") + '>›</button><span>共 ' + totalPages + " 页，" + rows.length + " 条</span>";
    el("pager").innerHTML = html;
  }

  function render() {
    var current = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    el("summary").textContent = "（当前查询 " + rows.length + " 条）";
    el("rows").innerHTML = current.map(function (alarm, index) {
      return '<tr><td><button class="action" data-view="' + esc(alarm.id) + '">查看</button></td><td>' + ((page - 1) * PAGE_SIZE + index + 1) + "</td><td>" + esc(alarm.time) + "</td><td>" + esc(alarm.dept) + "</td><td title=\"" + esc(alarm.location) + "\">" + esc(alarm.location) + "</td><td>" + esc(alarm.metric) + "</td><td>" + esc(displayValue(alarm)) + "</td><td>" + tag(alarm.level) + "</td><td>" + tag(alarm.status) + "</td><td title=\"" + esc(alarm.condition) + "\">" + esc(alarm.condition) + "</td></tr>";
    }).join("") || '<tr><td colspan="10" class="empty">暂无符合条件的智能预警</td></tr>';
    renderPager();
    metrics();
  }

  function open(id) {
    var alarm = alarms.find(function (item) { return item.id === id; });
    if (!alarm) return;
    var items = [
      ["预警编号", alarm.id], ["报警类型", alarm.type], ["预警时间", alarm.time],
      ["设备编号", alarm.deviceCode], ["监测对象", alarm.location], ["设备类型", alarm.deviceName],
      ["环境项目", alarm.metric], ["监测值", displayValue(alarm)], ["预警等级", alarm.level],
      ["处置状态", alarm.status], ["预警内容", alarm.condition, "full"]
    ];
    el("modalTitle").textContent = "查看环境预警";
    el("modalBody").innerHTML = '<div class="detail-grid">' + items.map(function (item) {
      return '<div class="detail-item ' + (item[2] || "") + '"><span>' + esc(item[0]) + "</span><strong>" + esc(item[1] || "--") + "</strong></div>";
    }).join("") + "</div>";
    el("modal").classList.remove("is-hidden");
  }

  document.body.onclick = function (event) {
    var node = event.target;
    if (node.dataset.close !== undefined) { el("modal").classList.add("is-hidden"); return; }
    if (node.dataset.view) { open(node.dataset.view); return; }
    if (node.dataset.page) { page = Number(node.dataset.page); render(); return; }
    if (node.dataset.pageDir) {
      page = Math.max(1, Math.min(Math.ceil(rows.length / PAGE_SIZE) || 1, page + Number(node.dataset.pageDir)));
      render();
    }
  };
  el("search").onclick = filter;
  el("reset").onclick = function () {
    document.querySelectorAll(".query-panel select").forEach(function (node) { node.selectedIndex = 0; });
    filter();
  };

  S.loadAlarms({ alarmType: "2" }).then(function (result) {
    alarms = result;
    initOptions();
    filter();
  }).catch(function () { toast("数据加载失败，请稍后重试"); });
})();
