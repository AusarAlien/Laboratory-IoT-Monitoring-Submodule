(function (global) {
  "use strict";
  var S = global.SyswljkEnvService, data = { projects: [] }, filtered = [], page = 1, PAGE = 10;
  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function toast(m) { el("toast").textContent = m; el("toast").classList.remove("is-hidden"); setTimeout(function () { el("toast").classList.add("is-hidden"); }, 2200); }
  function filter() {
    var k = el("keyword").value.trim().toLowerCase(), s = el("status").value;
    filtered = data.projects.filter(function (x) { return (!k || (x.name + " " + x.code).toLowerCase().indexOf(k) >= 0) && (!s || x.status === s); });
    page = 1; render();
  }
  function render() {
    var rows = filtered.slice((page - 1) * PAGE, page * PAGE), pages = Math.ceil(filtered.length / PAGE), h = "";
    el("rows").innerHTML = rows.map(function (x, i) {
      return '<tr><td><button class="action" data-id="' + esc(x.id) + '">查看</button></td><td>' + ((page - 1) * PAGE + i + 1) + "</td><td>" + esc(x.code) + "</td><td>" + esc(x.name) + "</td><td>" + esc(x.itemType || "--") + "</td><td>" + esc(x.unit || "--") + "</td><td>" + esc(x.lower || "--") + "</td><td>" + esc(x.upper || "--") + "</td><td>" + esc(x.defaultValue || "--") + "</td><td>" + esc(x.status) + "</td><td>" + esc(x.order) + "</td><td>" + esc(x.description || "--") + "</td></tr>";
    }).join("") || '<tr><td colspan="12" class="empty">暂无符合条件的环境项目</td></tr>';
    el("summary").textContent = "（当前查询 " + filtered.length + " 条）";
    el("metricTotal").textContent = data.projects.length;
    el("metricEnabled").textContent = data.projects.filter(function (x) { return x.status === "启用"; }).length;
    el("metricDefined").textContent = data.projects.filter(function (x) { return x.lower !== "" || x.upper !== ""; }).length;
    el("metricUnits").textContent = new Set(data.projects.map(function (x) { return x.unit; }).filter(Boolean)).size;
    h += '<button data-dir="-1" ' + (page <= 1 ? "disabled" : "") + '>‹</button>';
    for (var p = 1; p <= pages; p++) h += '<button data-page="' + p + '" class="' + (p === page ? "is-current" : "") + '">' + p + "</button>";
    h += '<button data-dir="1" ' + (page >= pages ? "disabled" : "") + '>›</button><span>共 ' + pages + " 页，" + filtered.length + " 条</span>";
    el("pager").innerHTML = h;
  }
  function view(id) {
    var x = data.projects.find(function (p) { return p.id === id; }); if (!x) return;
    var items = [["项目主键", x.sourceId], ["项目编码", x.code], ["项目名称", x.name], ["项目类型值", x.itemType || "--"], ["单位", x.unit || "--"], ["通用合格值1", x.lower || "--"], ["通用合格值2", x.upper || "--"], ["默认值", x.defaultValue || "--"], ["有效状态", x.status], ["排序", x.order], ["备注", x.description || "--"]];
    el("modalTitle").textContent = "环境项目详情";
    el("modalBody").innerHTML = items.map(function (i) { return '<div class="detail-item"><span>' + esc(i[0]) + "</span><strong>" + esc(i[1]) + "</strong></div>"; }).join("");
    el("modal").classList.remove("is-hidden");
  }
  document.body.onclick = function (e) { if (e.target.dataset.close !== undefined) el("modal").classList.add("is-hidden"); if (e.target.dataset.id) view(e.target.dataset.id); if (e.target.dataset.page) { page = Number(e.target.dataset.page); render(); } if (e.target.dataset.dir) { page = Math.max(1, page + Number(e.target.dataset.dir)); render(); } };
  el("search").onclick = filter;
  el("reset").onclick = function () { el("keyword").value = ""; el("status").value = ""; filter(); };
  S.loadAll().then(function (v) { data = v; filtered = data.projects.slice(); render(); }).catch(function () { toast("数据加载失败，请稍后重试"); });
})(window);
