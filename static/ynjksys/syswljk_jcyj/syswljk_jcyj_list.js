(function (global) {
  "use strict";
  var S = global.SyswljkWarningService;
  var PAGE_SIZE = 10;
  var data = { devices: [], standards: [], alarms: [], rules: [], pushes: [] };
  var alarmFiltered = [], ruleFiltered = [];
  var alarmPage = 1, rulePage = 1, ruleLoaded = false, ruleLoading = false;
  var modalSave = null;

  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function val(id) { return el(id).value.trim(); }
  function uid() { return "WR" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 10).toUpperCase(); }
  function title(v) { return ' title="' + esc(v || "--") + '"'; }
  function toast(message) { var node = el("toast"); node.textContent = message; node.classList.remove("is-hidden"); clearTimeout(toast.timer); toast.timer = setTimeout(function () { node.classList.add("is-hidden"); }, 2500); }
  function tag(v) { var kind = /已处理|已解除|启用|是/.test(v) ? "success" : /紧急|已失效|停用/.test(v) ? "danger" : /重要|待确认/.test(v) ? "warning" : "muted"; return '<span class="tag tag-' + kind + '">' + esc(v || "--") + "</span>"; }
  function unique(items, key) { var seen = {}; return items.filter(function (item) { var value = item[key]; if (!value || seen[value]) return false; seen[value] = true; return true; }); }
  function displayValue(alarm) { return alarm.value === "" ? "--" : alarm.value + (alarm.unit ? " " + alarm.unit : ""); }
  function condition(rule) { var parts = []; if (rule.lower != null) parts.push("低于 " + rule.lower + (rule.unit || "")); if (rule.upper != null) parts.push("高于 " + rule.upper + (rule.unit || "")); return parts.join(" 或 ") || "未设置"; }
  function field(id, label, value, required, type, full) { return '<label class="field ' + (full ? "full" : "") + '"><span class="' + (required ? "required" : "") + '">' + label + '</span><input id="' + id + '" type="' + (type || "text") + '" value="' + esc(value == null ? "" : value) + '" ' + (type === "number" ? 'step="any" ' : "") + (required ? "required" : "") + "></label>"; }

  function initAlarmOptions() {
    el("alarmDevice").innerHTML = '<option value="">全部设备</option>' + data.devices.map(function (d) { return '<option value="' + esc(d.id) + '">' + esc(d.area + "（" + d.name + "）") + "</option>"; }).join("");
    el("alarmMetric").innerHTML = '<option value="">全部指标</option>' + unique(data.alarms, "metricCode").map(function (a) { return '<option value="' + esc(a.metricCode) + '">' + esc(a.metric) + "</option>"; }).join("");
  }
  function renderMetrics() {
    el("metricTotal").textContent = data.alarms.length;
    el("metricDevices").textContent = unique(data.alarms, "deviceId").length;
    el("metricMetrics").textContent = unique(data.alarms, "metricCode").length;
    el("metricPending").textContent = data.alarms.filter(function (x) { return x.status === "待确认"; }).length;
    el("metricHandled").textContent = data.alarms.filter(function (x) { return x.status === "已处理"; }).length;
    el("metricInvalid").textContent = data.alarms.filter(function (x) { return x.status === "已失效"; }).length;
  }
  function pager(target, total, current, prefix) {
    var pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    var html = '<button data-' + prefix + '-dir="-1" ' + (current <= 1 ? "disabled" : "") + '>‹</button>';
    var from = Math.max(1, current - 2), to = Math.min(pages, from + 4); from = Math.max(1, to - 4);
    if (from > 1) html += '<button data-' + prefix + '-page="1">1</button>' + (from > 2 ? "<span>…</span>" : "");
    for (var i = from; i <= to; i++) html += '<button data-' + prefix + '-page="' + i + '" class="' + (i === current ? "is-current" : "") + '">' + i + "</button>";
    if (to < pages) html += (to < pages - 1 ? "<span>…</span>" : "") + '<button data-' + prefix + '-page="' + pages + '">' + pages + "</button>";
    html += '<button data-' + prefix + '-dir="1" ' + (current >= pages ? "disabled" : "") + '>›</button><span>共 ' + pages + " 页，" + total + " 条</span>";
    el(target).innerHTML = html;
  }

  function filterAlarms() {
    var start = val("alarmStart"), end = val("alarmEnd"), device = val("alarmDevice"), metric = val("alarmMetric"), level = val("alarmLevel"), status = val("alarmStatus");
    alarmFiltered = data.alarms.filter(function (a) { var day = a.time.slice(0, 10); return (!start || day >= start) && (!end || day <= end) && (!device || a.deviceId === device) && (!metric || a.metricCode === metric) && (!level || a.level === level) && (!status || a.status === status); });
    alarmPage = 1; renderAlarms();
  }
  function renderAlarms() {
    var rows = alarmFiltered.slice((alarmPage - 1) * PAGE_SIZE, alarmPage * PAGE_SIZE);
    el("alarmRows").innerHTML = rows.map(function (a, i) { return '<tr><td><button class="action" data-alarm-view="' + esc(a.id) + '">查看</button></td><td>' + ((alarmPage - 1) * PAGE_SIZE + i + 1) + "</td><td>" + esc(a.time) + "</td><td>" + tag(a.level) + "</td><td" + title(a.deviceCode) + ">" + esc(a.deviceCode) + "</td><td" + title(a.deviceName) + ">" + esc(a.deviceName) + "</td><td" + title(a.location) + ">" + esc(a.location) + "</td><td>" + esc(a.metric) + "</td><td>" + esc(displayValue(a)) + "</td><td" + title(a.condition) + ">" + esc(a.condition) + "</td><td>" + tag(a.status) + "</td></tr>"; }).join("");
    el("alarmSummary").textContent = "（当前查询 " + alarmFiltered.length + " 条）";
    el("alarmEmpty").classList.toggle("is-hidden", alarmFiltered.length > 0);
    pager("alarmPager", alarmFiltered.length, alarmPage, "alarm"); renderMetrics();
  }

  function initRuleOptions() {
    var types = unique(data.devices, "type");
    el("ruleType").innerHTML = '<option value="">全部类型</option>' + types.map(function (d) { return '<option>' + esc(d.type) + "</option>"; }).join("");
  }
  function filterRules() {
    var keyword = val("ruleKeyword").toLowerCase(), type = val("ruleType"), level = val("ruleLevel"), status = val("ruleStatus");
    ruleFiltered = data.rules.filter(function (r) { return (!keyword || (r.name + " " + r.metric + " " + r.targetName).toLowerCase().indexOf(keyword) >= 0) && (!type || r.deviceType === type) && (!level || r.level === level) && (!status || r.status === status); });
    rulePage = 1; renderRules();
  }
  function renderRules() {
    var rows = ruleFiltered.slice((rulePage - 1) * PAGE_SIZE, rulePage * PAGE_SIZE);
    el("ruleRows").innerHTML = rows.map(function (r, i) {
      return '<tr><td><button class="action" data-rule-view="' + esc(r.id) + '">查看</button><button class="action" data-rule-edit="' + esc(r.id) + '">修改</button><button class="action" data-rule-toggle="' + esc(r.id) + '">' + (r.status === "启用" ? "停用" : "启用") + '</button><button class="action danger" data-rule-delete="' + esc(r.id) + '">删除</button></td><td>' + ((rulePage - 1) * PAGE_SIZE + i + 1) + "</td><td" + title(r.name) + ">" + esc(r.name) + "</td><td>" + esc(r.deviceType) + "</td><td" + title(r.targetName) + ">" + esc(r.targetName) + "</td><td>" + esc(r.metric) + "</td><td" + title(condition(r)) + ">" + esc(condition(r)) + "</td><td>" + r.count + " 次</td><td>" + r.duration + " 分钟</td><td>" + tag(r.level) + "</td><td>" + tag(r.push ? "是" : "否") + "</td><td>" + tag(r.status) + "</td><td>" + esc(r.updateTime || "--") + "</td></tr>";
    }).join("");
    el("ruleSummary").textContent = "（当前查询 " + ruleFiltered.length + " 条）";
    el("ruleEmpty").classList.toggle("is-hidden", ruleFiltered.length > 0);
    pager("rulePager", ruleFiltered.length, rulePage, "rule");
  }
  function loadRules(force) {
    if (ruleLoading || (ruleLoaded && !force)) return;
    ruleLoading = true; el("ruleSummary").textContent = "（加载中）";
    S.loadRuleContext().then(function (result) { data.devices = result.devices; data.standards = result.standards; data.rules = result.rules; ruleLoaded = true; initRuleOptions(); filterRules(); }).catch(function () { el("ruleRows").innerHTML = '<tr><td colspan="13" class="load-error">阈值规则加载失败，请稍后重试</td></tr>'; el("ruleEmpty").classList.add("is-hidden"); el("ruleSummary").textContent = "（加载失败）"; toast("阈值规则加载失败，请稍后重试"); }).then(function () { ruleLoading = false; });
  }

  function openModal(titleText, body, save) { el("modalTitle").textContent = titleText; el("modalBody").innerHTML = body; el("modalSubmit").textContent = save ? "保存" : "关闭"; modalSave = save || null; el("modal").classList.remove("is-hidden"); }
  function closeModal() { el("modal").classList.add("is-hidden"); modalSave = null; }
  function openAlarm(id) {
    var a = data.alarms.find(function (x) { return x.id === id; }); if (!a) return;
    var items = [["预警编号", a.id], ["报警类型", a.type], ["预警时间", a.time], ["设备编号", a.deviceCode], ["设备名称", a.deviceName], ["监测位置", a.location], ["监测指标", a.metric], ["监测值", displayValue(a)], ["预警级别", a.level], ["处理状态", a.status], ["触发条件", a.condition, "full"]];
    openModal("查看预警详情", '<div class="detail-grid">' + items.map(function (x) { return '<div class="detail-item ' + (x[2] || "") + '"><span>' + esc(x[0]) + "</span><strong>" + esc(x[1] || "--") + "</strong></div>"; }).join("") + "</div>", null);
  }
  function deviceOptions(selected) { return '<option value="">请选择设备</option>' + data.devices.map(function (d) { return '<option value="' + esc(d.id) + '" ' + (d.id === selected ? "selected" : "") + '>' + esc(d.area + "（" + d.code + "）") + "</option>"; }).join(""); }
  function metricOptions(selected) { return '<option value="">请选择指标</option>' + data.standards.map(function (m) { return '<option value="' + esc(m.id) + '" ' + (m.id === selected ? "selected" : "") + '>' + esc(m.name + (m.unit ? "（" + m.unit + "）" : "")) + "</option>"; }).join(""); }
  function openRuleForm(id) {
    var original = id ? data.rules.find(function (x) { return x.id === id; }) : null;
    var r = original || { deviceType: "温湿度监测设备", targetType: "ALL", level: "一般", count: 1, duration: 0, push: true, status: "启用" };
    var body = '<div class="form-grid">' + field("fRuleName", "规则名称", r.name, true) + '<label class="field"><span class="required">设备类型</span><select id="fRuleDeviceType" required><option>' + esc(r.deviceType) + '</option></select></label><label class="field"><span class="required">适用范围</span><select id="fRuleTargetType"><option value="ALL" ' + (r.targetType === "ALL" ? "selected" : "") + '>全部同类设备</option><option value="DEVICE" ' + (r.targetType === "DEVICE" ? "selected" : "") + '>指定设备</option></select></label><label class="field" id="targetDeviceField"><span class="required">适用设备</span><select id="fRuleTargetId">' + deviceOptions(r.targetId) + '</select></label><label class="field"><span class="required">监测指标</span><select id="fRuleMetric" required>' + metricOptions(r.metricId) + "</select></label>" + field("fRuleLower", "下限", r.lower, false, "number") + field("fRuleUpper", "上限", r.upper, false, "number") + field("fRuleCount", "连续次数", r.count, true, "number") + field("fRuleDuration", "持续时长（分钟）", r.duration, true, "number") + '<label class="field"><span class="required">预警级别</span><select id="fRuleLevel"><option ' + (r.level === "一般" ? "selected" : "") + '>一般</option><option ' + (r.level === "重要" ? "selected" : "") + '>重要</option><option ' + (r.level === "紧急" ? "selected" : "") + '>紧急</option></select></label><label class="field"><span>使用状态</span><select id="fRuleStatus"><option ' + (r.status === "启用" ? "selected" : "") + '>启用</option><option ' + (r.status === "停用" ? "selected" : "") + '>停用</option></select></label>' + field("fRuleBegin", "生效日期", r.effectiveBegin, false, "date") + field("fRuleEnd", "失效日期", r.effectiveEnd, false, "date") + '<label class="field full check-line"><input id="fRulePush" type="checkbox" ' + (r.push ? "checked" : "") + '><span>超限后推送至平台集中预警</span></label><label class="field full"><span>规则说明</span><textarea id="fRuleRemark">' + esc(r.remark || "") + "</textarea></label></div>";
    openModal(id ? "修改阈值规则" : "新增阈值规则", body, function () {
      var lower = val("fRuleLower") === "" ? null : Number(val("fRuleLower")), upper = val("fRuleUpper") === "" ? null : Number(val("fRuleUpper"));
      if (!val("fRuleName") || !val("fRuleMetric")) { toast("请填写规则名称并选择监测指标"); return; }
      if (val("fRuleTargetType") === "DEVICE" && !val("fRuleTargetId")) { toast("请选择适用设备"); return; }
      if (lower == null && upper == null) { toast("下限和上限至少填写一项"); return; }
      if (lower != null && upper != null && lower >= upper) { toast("下限必须小于上限"); return; }
      if (!Number.isInteger(Number(val("fRuleCount"))) || !Number.isInteger(Number(val("fRuleDuration"))) || Number(val("fRuleCount")) < 1 || Number(val("fRuleDuration")) < 0) { toast("连续次数和持续时长必须为有效整数"); return; }
      if (val("fRuleBegin") && val("fRuleEnd") && val("fRuleBegin") > val("fRuleEnd")) { toast("失效日期不能早于生效日期"); return; }
      var model = { id: r.id || uid(), name: val("fRuleName"), deviceType: val("fRuleDeviceType"), targetType: val("fRuleTargetType"), targetId: val("fRuleTargetType") === "DEVICE" ? val("fRuleTargetId") : "", metricId: val("fRuleMetric"), lower: lower, upper: upper, count: Number(val("fRuleCount")), duration: Number(val("fRuleDuration")), level: val("fRuleLevel"), push: el("fRulePush").checked, status: val("fRuleStatus"), effectiveBegin: val("fRuleBegin"), effectiveEnd: val("fRuleEnd"), remark: val("fRuleRemark") };
      el("modalSubmit").disabled = true;
      S.saveRule(id ? "已改" : "新增", model).then(function () { closeModal(); toast(id ? "阈值规则已修改" : "阈值规则已新增"); loadRules(true); }).catch(function () { toast("阈值规则保存失败，请稍后重试"); }).then(function () { el("modalSubmit").disabled = false; });
    });
    function toggleTarget() { el("targetDeviceField").classList.toggle("is-hidden", val("fRuleTargetType") !== "DEVICE"); }
    el("fRuleTargetType").onchange = toggleTarget; toggleTarget();
    el("fRuleMetric").onchange = function () { var m = data.standards.find(function (x) { return x.id === val("fRuleMetric"); }); if (!m) return; if (val("fRuleLower") === "") el("fRuleLower").value = m.lower == null ? "" : m.lower; if (val("fRuleUpper") === "") el("fRuleUpper").value = m.upper == null ? "" : m.upper; };
  }
  function openRuleDetail(id) { var r = data.rules.find(function (x) { return x.id === id; }); if (!r) return; var items = [["规则编号", r.id], ["规则名称", r.name], ["设备类型", r.deviceType], ["适用设备", r.targetName], ["监测指标", r.metric + (r.unit ? "（" + r.unit + "）" : "")], ["判定条件", condition(r)], ["连续次数", r.count + " 次"], ["持续时长", r.duration + " 分钟"], ["预警级别", r.level], ["平台推送", r.push ? "是" : "否"], ["使用状态", r.status], ["生效区间", (r.effectiveBegin || "不限") + " 至 " + (r.effectiveEnd || "不限")], ["修改时间", r.updateTime], ["规则说明", r.remark, "full"]]; openModal("查看阈值规则", '<div class="detail-grid">' + items.map(function (x) { return '<div class="detail-item ' + (x[2] || "") + '"><span>' + esc(x[0]) + "</span><strong>" + esc(x[1] || "--") + "</strong></div>"; }).join("") + "</div>", null); }
  function toggleRule(id) { var r = data.rules.find(function (x) { return x.id === id; }); if (!r) return; var next = Object.assign({}, r, { status: r.status === "启用" ? "停用" : "启用" }); S.saveRule("已改", next).then(function () { toast("规则已" + next.status); loadRules(true); }).catch(function () { toast("规则状态更新失败，请稍后重试"); }); }
  function deleteRule(id) { var r = data.rules.find(function (x) { return x.id === id; }); if (!r) return; if (r.status === "启用") { toast("请先停用规则，再执行删除"); return; } if (!global.confirm("确定删除阈值规则“" + r.name + "”吗？")) return; S.saveRule("已删", r).then(function () { toast("阈值规则已删除"); loadRules(true); }).catch(function () { toast("阈值规则删除失败，请稍后重试"); }); }

  function bind() {
    document.querySelector(".page-tabs").onclick = function (e) { var tab = e.target.dataset.tab; if (!tab) return; document.querySelectorAll(".page-tab").forEach(function (n) { n.classList.toggle("is-active", n.dataset.tab === tab); }); document.querySelectorAll(".tab-panel").forEach(function (n) { n.classList.add("is-hidden"); }); el(tab + "Panel").classList.remove("is-hidden"); if (tab === "rule") loadRules(false); };
    document.body.onclick = function (e) {
      var n = e.target;
      if (n.dataset.close !== undefined) { closeModal(); return; }
      if (n.dataset.alarmView) { openAlarm(n.dataset.alarmView); return; }
      if (n.dataset.ruleAdd !== undefined) { if (ruleLoaded) openRuleForm(); return; }
      if (n.dataset.ruleView) { openRuleDetail(n.dataset.ruleView); return; }
      if (n.dataset.ruleEdit) { openRuleForm(n.dataset.ruleEdit); return; }
      if (n.dataset.ruleToggle) { toggleRule(n.dataset.ruleToggle); return; }
      if (n.dataset.ruleDelete) { deleteRule(n.dataset.ruleDelete); return; }
      if (n.dataset.search === "alarm") { filterAlarms(); return; }
      if (n.dataset.search === "rule") { filterRules(); return; }
      if (n.dataset.reset) { el(n.dataset.reset + "Panel").querySelectorAll("input,select").forEach(function (x) { x.value = ""; }); if (n.dataset.reset === "alarm") filterAlarms(); else filterRules(); return; }
      if (n.dataset.alarmPage) { alarmPage = Number(n.dataset.alarmPage); renderAlarms(); return; }
      if (n.dataset.alarmDir) { alarmPage = Math.max(1, Math.min(Math.ceil(alarmFiltered.length / PAGE_SIZE) || 1, alarmPage + Number(n.dataset.alarmDir))); renderAlarms(); return; }
      if (n.dataset.rulePage) { rulePage = Number(n.dataset.rulePage); renderRules(); return; }
      if (n.dataset.ruleDir) { rulePage = Math.max(1, Math.min(Math.ceil(ruleFiltered.length / PAGE_SIZE) || 1, rulePage + Number(n.dataset.ruleDir))); renderRules(); }
    };
    el("modalForm").onsubmit = function (e) { e.preventDefault(); if (modalSave) modalSave(); else closeModal(); };
  }
  function init() { bind(); S.loadAll().then(function (result) { data.alarms = result.alarms; data.devices = result.devices; initAlarmOptions(); filterAlarms(); el("ruleSummary").textContent = "（进入页签后加载）"; el("pushSummary").textContent = "（当前查询 0 条）"; el("pushEmpty").classList.remove("is-hidden"); }).catch(function () { toast("数据加载失败，请稍后重试"); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(window);
