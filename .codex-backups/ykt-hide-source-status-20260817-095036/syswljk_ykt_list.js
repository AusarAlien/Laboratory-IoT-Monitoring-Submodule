(function (global) {
  "use strict";
  var data = global.YktData || { people: [], activities: [], exceptions: [], sources: [] };
  var state = { tab: "people", rows: [], page: 1, pageSize: 10 };
  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function person(id) { return data.people.find(function (x) { return x.id === id; }); }
  function tag(v) { var c = /正常|在职|已记录/.test(v) ? "ok" : /异常|重要|待确认/.test(v) ? "bad" : "warn"; return '<span class="tag ' + c + '">' + esc(v) + "</span>"; }
  function detail(items) { return '<div class="detail-grid">' + items.map(function (x) { return '<div class="detail ' + (x[2] || "") + '"><span>' + esc(x[0]) + "</span><strong>" + esc(x[1] || "--") + "</strong></div>"; }).join("") + "</div>"; }
  var config = {
    people: { title: "人员活动卡", statuses: ["在职"], columns: [] },
    activities: { title: "活动记录", statuses: ["正常", "异常"], columns: [["操作", "action"], ["序号", "seq"], ["活动时间", "time"], ["人员编号", "personId"], ["人员姓名", "personName"], ["所属部门", "dept"], ["来源系统", "source"], ["活动类型", "type"], ["活动位置", "location"], ["识别方式", "method"], ["结果", "result"]] },
    exceptions: { title: "异常活动", statuses: ["待确认", "已记录"], columns: [["操作", "action"], ["序号", "seq"], ["发生时间", "time"], ["人员编号", "personId"], ["人员姓名", "personName"], ["所属部门", "dept"], ["来源系统", "source"], ["异常类型", "type"], ["活动位置", "location"], ["级别", "level"], ["状态", "status"]] },
    sources: { title: "数据接入状态", statuses: ["正常", "异常"], columns: [["操作", "action"], ["序号", "seq"], ["系统编码", "id"], ["来源系统", "name"], ["数据类别", "category"], ["状态", "status"], ["最近接收时间", "lastTime"], ["更新周期", "interval"], ["今日数据", "todayCount"], ["异常数据", "exceptionCount"]] }
  };
  function sourceRows() {
    if (state.tab === "people") return data.people.slice();
    if (state.tab === "activities") return data.activities.map(function (x) { var p = person(x.personId) || {}; return Object.assign({}, x, { personName: p.name, dept: p.dept }); });
    if (state.tab === "exceptions") return data.exceptions.map(function (x) { var p = person(x.personId) || {}; return Object.assign({}, x, { personName: p.name, dept: p.dept }); });
    return data.sources.slice();
  }
  function metrics() {
    el("mPeople").textContent = data.people.length;
    el("mActivePeople").textContent = data.people.filter(function (x) { return num(x.todayCount) > 0; }).length;
    el("mActivities").textContent = data.people.reduce(function (sum, x) { return sum + num(x.todayCount); }, 0);
    el("mExceptions").textContent = data.people.reduce(function (sum, x) { return sum + num(x.exceptionCount); }, 0);
    el("mSources").textContent = data.sources.length;
  }
  function filter() {
    var keyword = el("keyword").value.trim().toLowerCase(), dept = el("department").value, source = el("source").value, status = el("status").value;
    state.rows = sourceRows().filter(function (x) {
      var text = Object.keys(x).map(function (k) { return Array.isArray(x[k]) ? x[k].join(" ") : x[k]; }).join(" ").toLowerCase();
      var sources = Array.isArray(x.sources) ? x.sources : [x.source || x.name || ""];
      return (!keyword || text.indexOf(keyword) >= 0) && (!dept || x.dept === dept) && (!source || sources.indexOf(source) >= 0) && (!status || x.status === status || x.result === status);
    });
    state.page = 1;
    render();
  }
  function pageRows() { var start = (state.page - 1) * state.pageSize; return state.rows.slice(start, start + state.pageSize); }
  function renderCards() {
    el("cardView").innerHTML = pageRows().map(function (x, i) {
      return '<article class="person-card"><div class="person-head"><span class="avatar">' + esc(x.name.slice(0, 1)) + '</span><div><h2>' + esc(x.name) + '</h2><p>' + esc(x.id + " · " + x.role) + '</p></div>' + tag(x.status) + '</div><dl><div><dt>所属部门</dt><dd>' + esc(x.dept) + '</dd></div><div><dt>数据卡号</dt><dd>' + esc(x.cardNo) + '</dd></div><div><dt>最近活动</dt><dd>' + esc(x.lastTime) + '</dd></div><div><dt>最近位置</dt><dd>' + esc(x.lastLocation) + '</dd></div></dl><div class="person-foot"><span>今日 <b>' + x.todayCount + '</b> 次</span><span class="' + (x.exceptionCount ? "danger" : "") + '">异常 <b>' + x.exceptionCount + '</b> 条</span><button class="action" data-view="' + ((state.page - 1) * state.pageSize + i) + '">查看活动</button></div></article>';
    }).join("") || '<div class="empty-card">暂无符合条件的人员活动卡</div>';
  }
  function renderTable() {
    var cols = config[state.tab].columns;
    el("thead").innerHTML = "<tr>" + cols.map(function (c) { return "<th>" + c[0] + "</th>"; }).join("") + "</tr>";
    el("tbody").innerHTML = pageRows().map(function (x, i) {
      var rowIndex = (state.page - 1) * state.pageSize + i;
      return "<tr>" + cols.map(function (c) {
        if (c[1] === "action") return '<td><button class="action" data-view="' + rowIndex + '">查看</button></td>';
        if (c[1] === "seq") return "<td>" + (rowIndex + 1) + "</td>";
        var v = x[c[1]];
        if (["status", "result", "level"].indexOf(c[1]) >= 0) return "<td>" + tag(v) + "</td>";
        return '<td title="' + esc(v || "--") + '">' + esc(v || "--") + "</td>";
      }).join("") + "</tr>";
    }).join("") || '<tr><td class="empty" colspan="' + cols.length + '">暂无符合条件的数据</td></tr>';
  }
  function renderPager() {
    var pages = Math.max(1, Math.ceil(state.rows.length / state.pageSize)), html = '<button data-page="' + (state.page - 1) + '" ' + (state.page <= 1 ? "disabled" : "") + '>‹</button>';
    for (var i = 1; i <= pages; i++) html += '<button data-page="' + i + '" class="' + (i === state.page ? "current" : "") + '">' + i + "</button>";
    html += '<button data-page="' + (state.page + 1) + '" ' + (state.page >= pages ? "disabled" : "") + '>›</button><span>共 ' + pages + " 页，" + state.rows.length + " 条</span>";
    el("pagination").innerHTML = html;
  }
  function render() {
    var isCards = state.tab === "people";
    el("listTitle").textContent = config[state.tab].title;
    el("summary").textContent = "（当前查询 " + state.rows.length + " 条）";
    el("cardView").classList.toggle("hidden", !isCards);
    el("tableView").classList.toggle("hidden", isCards);
    el("headActions").innerHTML = state.tab === "activities" ? '<button class="button" data-export>导出当前结果</button>' : "";
    if (isCards) renderCards(); else renderTable();
    renderPager(); metrics();
  }
  function switchTab(tab) {
    state.tab = tab; state.page = 1;
    document.querySelectorAll(".tabs button").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    el("status").innerHTML = '<option value="">全部状态</option>' + config[tab].statuses.map(function (x) { return "<option>" + x + "</option>"; }).join("");
    filter();
  }
  function openDetail(index) {
    var x = state.rows[Number(index)]; if (!x) return;
    var items;
    if (state.tab === "people") {
      var acts = data.activities.filter(function (a) { return a.personId === x.id; });
      items = [["人员编号", x.id], ["姓名", x.name], ["所属部门", x.dept], ["岗位/角色", x.role], ["数据卡号", x.cardNo], ["人员状态", x.status], ["最近活动时间", x.lastTime], ["最近活动位置", x.lastLocation], ["来源系统", x.sources.join("、")], ["今日活动", acts.map(function (a) { return a.time + "｜" + a.type + "｜" + a.location; }).join("\n") || "--", "full multiline"]];
    } else items = Object.keys(x).map(function (k) { return [k, x[k]]; });
    el("modalTitle").textContent = "查看" + config[state.tab].title;
    el("modalBody").innerHTML = detail(items);
    el("modal").classList.remove("hidden");
  }
  function exportCsv() {
    var cols = config.activities.columns.filter(function (c) { return c[1] !== "action"; });
    var csv = cols.map(function (c) { return c[0]; }).join(",") + "\n" + state.rows.map(function (r, i) { return cols.map(function (c) { var v = c[1] === "seq" ? i + 1 : r[c[1]]; return '"' + String(v || "").replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "一卡通活动记录.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
  document.body.addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset.tab) switchTab(t.dataset.tab);
    if (t.dataset.close !== undefined) el("modal").classList.add("hidden");
    if (t.dataset.view !== undefined) openDetail(t.dataset.view);
    if (t.dataset.page && !t.disabled) { state.page = Number(t.dataset.page); render(); }
    if (t.dataset.export !== undefined) exportCsv();
  });
  el("search").onclick = filter;
  el("reset").onclick = function () { ["keyword", "department", "source", "status"].forEach(function (id) { el(id).value = ""; }); filter(); };
  function initOptions() {
    var departments = Array.from(new Set(data.people.map(function (x) { return x.dept; })));
    el("department").innerHTML += departments.map(function (x) { return "<option>" + esc(x) + "</option>"; }).join("");
    el("source").innerHTML += data.sources.map(function (x) { return "<option>" + esc(x.name) + "</option>"; }).join("");
  }
  initOptions(); switchTab("people");
})(window);
