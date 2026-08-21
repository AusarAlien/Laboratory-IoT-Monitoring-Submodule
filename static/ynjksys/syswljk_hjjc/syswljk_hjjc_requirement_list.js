(function (global) {
  "use strict";
  var S = global.SyswljkEnvService, data = { projects: [], objects: [], requirements: [] }, rows = [];
  function el(id) { return document.getElementById(id); }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function option(sel, value, text) { var o = document.createElement("option"); o.value = value; o.textContent = text; sel.appendChild(o); }
  function toast(m) { el("toast").textContent = m; el("toast").classList.remove("is-hidden"); setTimeout(function () { el("toast").classList.add("is-hidden"); }, 2200); }
  function initOptions() {
    Array.from(new Set(data.requirements.map(function (x) { return x.department; }))).sort().forEach(function (x) { option(el("qDept"), x, x); });
    data.requirements.filter(function (x, i, all) {
      return all.findIndex(function (item) { return item.objectId === x.objectId; }) === i;
    }).forEach(function (x) { option(el("qObject"), x.objectId, x.labName || x.objectId); });
    data.requirements.filter(function (x, i, all) {
      return all.findIndex(function (item) { return item.projectId === x.projectId; }) === i;
    }).forEach(function (x) { option(el("qProject"), x.projectId, x.projectName || x.projectId); });
  }
  function filter() {
    var d = el("qDept").value, o = el("qObject").value, p = el("qProject").value, s = el("qStatus").value;
    rows = data.requirements.filter(function (r) { return (!d || r.department === d) && (!o || r.objectId === o) && (!p || r.projectId === p) && (!s || r.status === s); }); render();
  }
  function render() {
    el("mTotal").textContent = data.requirements.length;
    el("mEnabled").textContent = data.requirements.filter(function (x) { return x.status === "启用"; }).length;
    el("mObjects").textContent = new Set(data.requirements.map(function (x) { return x.objectId; })).size;
    el("mProjects").textContent = new Set(data.requirements.map(function (x) { return x.projectId; })).size;
    el("summary").textContent = "（当前查询 " + rows.length + " 条）";
    el("rows").innerHTML = rows.map(function (r, i) {
      return '<tr><td><button class="action" data-id="' + esc(r.id) + '">查看</button></td><td>' + (i + 1) + "</td><td>" + esc(r.department) + "</td><td>" + esc(r.objectType) + "</td><td>" + esc(r.labName) + "</td><td>" + esc(r.projectName) + "</td><td>" + esc(r.lower == null || r.lower === "" ? "--" : r.lower) + "</td><td>" + esc(r.upper == null || r.upper === "" ? "--" : r.upper) + "</td><td>" + esc(r.unit || "--") + "</td><td>" + esc(r.status) + "</td><td>实验室档案</td></tr>";
    }).join("") || '<tr><td colspan="11" class="empty">暂无符合条件的环境条件要求</td></tr>';
  }
  function view(id) {
    var r = data.requirements.find(function (x) { return x.id === id; }); if (!r) return;
    var items = [["实验室", r.labName], ["实验室编号", r.labId], ["环境项目", r.projectName], ["下限", r.lower || "--"], ["上限", r.upper || "--"], ["单位", r.unit || "--"], ["状态", r.status], ["数据来源", "LIS_LIBDEF"]];
    el("modalTitle").textContent = "环境条件要求详情";
    el("modalBody").innerHTML = items.map(function (i) { return '<div class="detail-item"><span>' + esc(i[0]) + "</span><strong>" + esc(i[1]) + "</strong></div>"; }).join("");
    el("modal").classList.remove("is-hidden");
  }
  document.body.onclick = function (e) { if (e.target.dataset.close !== undefined) el("modal").classList.add("is-hidden"); if (e.target.dataset.id) view(e.target.dataset.id); };
  el("search").onclick = filter;
  el("reset").onclick = function () { ["qDept", "qObject", "qProject", "qStatus"].forEach(function (id) { el(id).value = ""; }); filter(); };
  S.loadRequirements().then(function (requirements) {
    data.requirements = requirements;
    rows = data.requirements.slice();
    initOptions();
    render();
  }).catch(function () { toast("环境条件要求加载失败，请稍后重试"); });
})(window);
