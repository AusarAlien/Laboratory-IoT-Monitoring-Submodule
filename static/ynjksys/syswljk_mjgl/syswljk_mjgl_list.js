(function (global) {
  "use strict";
  var S = global.MjglService;
  var state = { tab: "monitor", records: [], devices: [], people: [], operations: [], areas: [], total: 0, page: 1, pageSize: 10, summary: {} };
  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function value(row, name) { if (!row) return ""; if (row[name] !== undefined) return row[name]; var key = Object.keys(row).find(function (k) { return k.toUpperCase() === name.toUpperCase(); }); return key ? row[key] : ""; }
  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function formatDateTime(v) { return !v ? null : String(v).replace("T", " ") + (String(v).length === 16 ? ":00" : ""); }
  function showError(error) { el("toast").textContent = error && error.message ? error.message : String(error || "查询失败"); el("toast").classList.remove("hidden"); clearTimeout(showError.t); showError.t = setTimeout(function () { el("toast").classList.add("hidden"); }, 3200); }
  var columns = {
    records: [["操作", "action"], ["序号", "FROWSEQ"], ["发生时间", "FCHECKTIME"], ["人员编号", "FBADGENUMBER"], ["人员姓名", "FNAME"], ["卡号", "FCARDNO"], ["实验室", "FLABNAME"], ["所属区域", "FAREA"], ["门禁设备SN", "FSN"], ["门点", "FSENSORID"], ["出入方向", "FCHECKTYPE"], ["验证方式", "FCODETYPE"], ["口罩标记", "FMASKFLAG"], ["体温", "FTEMPERATURE"], ["设备备注", "FMEMOINFO"]],
    devices: [["操作", "action"], ["序号", "seq"], ["设备序列号", "FSN"], ["实验室", "FLABNAME"], ["所属区域", "FAREA"], ["区域别名", "FAREAALIAS"], ["门点数量", "FSENSORCOUNT"], ["累计记录", "FRECORDCOUNT"], ["最近记录时间", "FLASTCHECKTIME"]],
    people: [["操作", "action"], ["序号", "seq"], ["用户ID", "FUSERID"], ["人员编号", "FBADGENUMBER"], ["姓名", "FNAME"], ["卡号", "FCARDNO"], ["默认部门ID", "FDEFAULTDEPTID"], ["验证方法代码", "FVERIFICATIONMETHOD"], ["权限级别", "FPRIVILEGE"], ["有效状态", "FEXPIRESTATUS"], ["有效期开始", "FVALIDTIMEBEGIN"], ["有效期结束", "FVALIDTIMEEND"], ["照片状态", "FPHOTOSTATUS"]],
    operations: [["序号", "seq"], ["操作时间", "FOPTIME"], ["实验室/区域", "FAREA"], ["门禁设备", "FSN"], ["操作类型", "FOPTYPE"], ["操作人员", "FOPERATOR"], ["执行结果", "FRESULT"]]
  };
  function filters() { return { keyword: el("keyword").value.trim(), area: el("area").value, sn: el("device").value, direction: el("direction").value, verifyCode: el("verify").value, startTime: formatDateTime(el("startTime").value), endTime: formatDateTime(el("endTime").value), page: state.page, pageSize: state.pageSize }; }
  function validate(f) { return f.startTime && f.endTime && f.startTime > f.endTime ? "开始时间不能晚于结束时间" : ""; }
  function setLoading(on) { el("search").disabled = on; el("reset").disabled = on; if (on && state.tab !== "monitor") { el("tbody").innerHTML = '<tr><td class="loading" colspan="15">正在加载...</td></tr>'; el("pagination").innerHTML = ""; } }
  function metrics() { var r = state.summary || {}; el("mControllers").textContent = state.devices.length; el("mAreas").textContent = state.areas.length; el("mRecords").textContent = num(value(r, "FRECORDCOUNT")); el("mEntry").textContent = num(value(r, "FENTRYCOUNT")); el("mExit").textContent = num(value(r, "FEXITCOUNT")); }
  function recordKey(r) { return [value(r, "FUSERID"), value(r, "FSN"), value(r, "FSENSORID"), value(r, "FCHECKTIME")].join("|"); }
  function filteredOptions(list) { var keyword = el("optionKeyword").value.trim().toLowerCase(); return list.filter(function (r) { return !keyword || Object.keys(r).some(function (k) { return String(r[k] || "").toLowerCase().indexOf(keyword) >= 0; }); }); }
  function renderTable() {
    var list = state[state.tab] || [], cols = columns[state.tab];
    if (state.tab === "devices" || state.tab === "people") list = filteredOptions(list);
    el("thead").innerHTML = "<tr>" + cols.map(function (c) { return "<th>" + c[0] + "</th>"; }).join("") + "</tr>";
    el("tbody").innerHTML = list.map(function (r, i) { var sourceIndex = (state[state.tab] || []).indexOf(r); return "<tr>" + cols.map(function (c) {
      if (c[1] === "action") return '<td><button class="action" data-index="' + sourceIndex + '">查看</button></td>';
      if (c[1] === "seq") return "<td>" + (i + 1) + "</td>";
      var v = value(r, c[1]); if (c[1] === "FTEMPERATURE" && v !== "" && v != null) v += " ℃";
      return '<td title="' + esc(v || "--") + '">' + esc(v || "--") + "</td>";
    }).join("") + "</tr>"; }).join("") || '<tr><td class="empty" colspan="' + cols.length + '">暂无符合条件的数据</td></tr>';
    el("summary").textContent = "（当前显示 " + list.length + (state.tab === "records" ? " 条，共 " + state.total + " 条" : " 条") + "）";
    renderPager();
  }
  function renderPager() {
    if (state.tab !== "records") { el("pagination").innerHTML = ""; return; }
    var pages = Math.max(1, Math.ceil(state.total / state.pageSize)), start = Math.max(1, state.page - 2), end = Math.min(pages, start + 4), html = ""; start = Math.max(1, end - 4);
    html += '<button data-page="' + (state.page - 1) + '" ' + (state.page <= 1 ? "disabled" : "") + '>‹</button>';
    for (var i = start; i <= end; i++) html += '<button data-page="' + i + '" class="' + (i === state.page ? "current" : "") + '">' + i + "</button>";
    html += '<button data-page="' + (state.page + 1) + '" ' + (state.page >= pages ? "disabled" : "") + '>›</button><span>共 ' + pages + " 页，" + state.total + " 条</span>"; el("pagination").innerHTML = html;
  }
  function latestFor(sn) { return state.records.find(function (r) { return String(value(r, "FSN")) === String(sn); }); }
  function renderMonitor() {
    var area = el("area").value, sn = el("device").value;
    var devices = state.devices.filter(function (d) { return (!area || value(d, "FAREA") === area) && (!sn || String(value(d, "FSN")) === String(sn)); });
    el("monitorSummary").textContent = "（当前显示 " + devices.length + " 个门禁控制器）";
    el("doorGrid").innerHTML = devices.map(function (d, i) { var deviceSn = value(d, "FSN"), last = latestFor(deviceSn); return '<article class="door-card"><div class="door-title"><span class="door-icon">门</span><div><h2>' + esc(value(d, "FAREA") || value(d, "FLABNAME") || "未命名区域") + '</h2><p>' + esc(deviceSn || "--") + '</p></div><button class="action" data-device-index="' + state.devices.indexOf(d) + '">详情</button></div><dl><div><dt>实验室</dt><dd>' + esc(value(d, "FLABNAME") || "--") + '</dd></div><div><dt>门点数量</dt><dd>' + esc(value(d, "FSENSORCOUNT") || "--") + '</dd></div><div><dt>最近活动</dt><dd>' + esc(value(d, "FLASTCHECKTIME") || value(last, "FCHECKTIME") || "--") + '</dd></div><div><dt>最近人员</dt><dd>' + esc(value(last, "FNAME") || "--") + '</dd></div><div><dt>控制器状态</dt><dd>--</dd></div><div><dt>门状态</dt><dd>--</dd></div></dl><div class="remote-actions"><button disabled title="当前门点未提供远程开锁能力">远程开锁</button><button disabled title="当前门点未提供呼叫能力">发起呼叫</button><button disabled title="当前门点未提供视频能力">查看视频</button></div></article>'; }).join("") || '<div class="empty-card">暂无符合条件的门禁控制器</div>';
    el("eventStream").innerHTML = state.records.slice(0, 10).map(function (r, i) { return '<button class="event-item" data-record-index="' + i + '"><span class="event-direction ' + (value(r, "FCHECKTYPE") === "离开" ? "exit" : "") + '">' + esc(value(r, "FCHECKTYPE") || "事件") + '</span><strong>' + esc(value(r, "FNAME") || "未知人员") + '</strong><small>' + esc(value(r, "FCHECKTIME") || "--") + '</small><p>' + esc((value(r, "FAREA") || "--") + " · " + (value(r, "FCODETYPE") || "--")) + "</p></button>"; }).join("") || '<div class="empty-stream">暂无门禁事件</div>';
    metrics();
  }
  function loadRecords() {
    var f = filters(), msg = validate(f); if (msg) { showError(msg); return Promise.resolve(); }
    if (state.tab === "monitor") { f.page = 1; f.pageSize = 10; }
    setLoading(true);
    return Promise.all([S.loadRecords(f), S.loadSummary(f)]).then(function (result) { state.records = result[0]; state.total = state.records.length ? num(value(state.records[0], "FTOTALCOUNT")) : 0; state.summary = result[1][0] || {}; if (state.tab === "monitor") renderMonitor(); else renderTable(); metrics(); }).catch(function (e) { console.error("门禁记录加载失败：", e); state.records = []; state.total = 0; if (state.tab === "monitor") { renderMonitor(); } else { el("tbody").innerHTML = '<tr><td class="load-error" colspan="15">数据加载失败，请稍后重试</td></tr>'; el("summary").textContent = "（加载失败）"; } showError("数据加载失败，请稍后重试"); }).finally(function () { setLoading(false); });
  }
  function loadCurrent() { if (state.tab === "monitor" || state.tab === "records") return loadRecords(); renderTable(); return Promise.resolve(); }
  function switchTab(tab) {
    state.tab = tab; state.page = 1;
    document.querySelectorAll(".tabs button").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    document.querySelectorAll("[data-for]").forEach(function (x) { var tabs = (x.dataset.for || "").split(" "); x.classList.toggle("hidden", tabs.indexOf(tab) < 0); });
    el("queryPanel").classList.toggle("hidden", tab === "operations");
    el("monitorView").classList.toggle("hidden", tab !== "monitor"); el("listView").classList.toggle("hidden", tab === "monitor");
    if (tab !== "monitor") { el("listTitle").textContent = { records: "门禁事件", devices: "门禁设备", people: "人员查询", operations: "远程操作记录" }[tab]; el("headActions").innerHTML = tab === "records" ? '<button class="button" data-export>导出当前结果</button>' : ""; }
    loadCurrent();
  }
  function fillOptions() {
    el("area").innerHTML = '<option value="">全部区域</option>' + state.areas.map(function (r) { var v = value(r, "FAREA"), alias = value(r, "FAREAALIAS"); return '<option value="' + esc(v) + '">' + esc(v + (alias && alias !== v ? "（" + alias + "）" : "")) + "</option>"; }).join("");
    el("device").innerHTML = '<option value="">全部设备</option>' + state.devices.map(function (r) { var sn = value(r, "FSN"), name = value(r, "FLABNAME") || value(r, "FAREA") || sn; return '<option value="' + esc(sn) + '">' + esc(name + "｜" + sn) + "</option>"; }).join("");
  }
  function openDetail(row, title, cols) { if (!row) return; el("modalTitle").textContent = title; el("modalBody").innerHTML = '<div class="detail-grid">' + cols.filter(function (c) { return c[1] !== "action" && c[1] !== "seq"; }).map(function (c) { return '<div class="detail"><span>' + c[0] + "</span><strong>" + esc(value(row, c[1]) || "--") + "</strong></div>"; }).join("") + "</div>"; el("modal").classList.remove("hidden"); }
  function exportCsv() { var cols = columns.records.filter(function (c) { return c[1] !== "action"; }), csv = cols.map(function (c) { return c[0]; }).join(",") + "\n" + state.records.map(function (r) { return cols.map(function (c) { return '"' + String(value(r, c[1]) || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n"), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "门禁事件.csv"; a.click(); URL.revokeObjectURL(a.href); }
  document.body.addEventListener("click", function (e) { var t = e.target; if (t.dataset.tab) switchTab(t.dataset.tab); if (t.dataset.close !== undefined) el("modal").classList.add("hidden"); if (t.dataset.index !== undefined) openDetail(state[state.tab][Number(t.dataset.index)], "查看" + ({ records: "门禁事件", devices: "门禁设备", people: "人员" }[state.tab] || "记录"), columns[state.tab]); if (t.dataset.deviceIndex !== undefined) openDetail(state.devices[Number(t.dataset.deviceIndex)], "查看门禁设备", columns.devices); if (t.dataset.recordIndex !== undefined) openDetail(state.records[Number(t.dataset.recordIndex)], "查看门禁事件", columns.records); if (t.dataset.page && !t.disabled) { state.page = Number(t.dataset.page); loadRecords(); } if (t.dataset.refresh !== undefined) loadRecords(); if (t.dataset.export !== undefined) exportCsv(); });
  el("search").onclick = function () { state.page = 1; if (state.tab === "people") S.loadPeople(el("optionKeyword").value.trim()).then(function (r) { state.people = r; renderTable(); }).catch(showError); else loadCurrent(); };
  el("reset").onclick = function () { ["keyword", "area", "device", "direction", "verify", "startTime", "endTime", "optionKeyword"].forEach(function (id) { el(id).value = ""; }); state.page = 1; loadCurrent(); };
  el("optionKeyword").oninput = function () { if (state.tab === "devices" || state.tab === "people") renderTable(); };
  function init() { if (typeof global.initGlobalParams === "function") global.initGlobalParams(); setLoading(true); Promise.all([S.loadAreas(), S.loadDevices(), S.loadPeople("")]).then(function (r) { state.areas = r[0]; state.devices = r[1]; state.people = r[2]; fillOptions(); return loadRecords(); }).catch(function (e) { console.error("门禁页面初始化失败：", e); showError("数据加载失败，请稍后重试"); }).finally(function () { setLoading(false); }); }
  global.addEventListener("load", init);
})(window);
