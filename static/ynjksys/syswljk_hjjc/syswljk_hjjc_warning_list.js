(function () {
  "use strict";
  var S = window.SyswljkEnvService,
    data,
    rows = [],
    active;
  function el(i) {
    return document.getElementById(i);
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function object(id) {
    return data.objects.find(function (x) {
      return x.id === id;
    });
  }
  function project(id) {
    return data.projects.find(function (x) {
      return x.id === id;
    });
  }
  function opt(sel, a, k, t) {
    a.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x[k];
      o.textContent = x[t];
      sel.appendChild(o);
    });
  }
  function toast(m) {
    el("toast").textContent = m;
    el("toast").classList.remove("is-hidden");
    setTimeout(function () {
      el("toast").classList.add("is-hidden");
    }, 1800);
  }
  function init() {
    opt(
      el("qDept"),
      Array.from(
        new Set(
          data.objects.map(function (x) {
            return x.department;
          }),
        ),
      ).map(function (x) {
        return { v: x, t: x };
      }),
      "v",
      "t",
    );
    opt(el("qObject"), data.objects, "id", "name");
    opt(el("qProject"), data.projects, "id", "name");
  }
  function filter() {
    var d = el("qDept").value,
      o = el("qObject").value,
      p = el("qProject").value,
      l = el("qLevel").value,
      s = el("qStatus").value;
    rows = data.alarms.filter(function (a) {
      var x = object(a.objectId);
      return (
        (!d || x.department === d) &&
        (!o || a.objectId === o) &&
        (!p || a.projectId === p) &&
        (!l || a.level === l) &&
        (!s || a.status === s)
      );
    });
    render();
  }
  function tag(v) {
    var c =
      v === "已解除" || v.indexOf("成功") >= 0
        ? "tag-success"
        : v === "待确认" || v.indexOf("失败") >= 0
          ? "tag-danger"
          : v === "处理中"
            ? "tag-warning"
            : "tag-muted";
    return '<span class="tag ' + c + '">' + esc(v) + "</span>";
  }
  function render() {
    el("mTotal").textContent = data.alarms.length;
    el("mPending").textContent = data.alarms.filter(function (x) {
      return x.status === "待确认";
    }).length;
    el("mDoing").textContent = data.alarms.filter(function (x) {
      return x.status === "处理中";
    }).length;
    el("mDone").textContent = data.alarms.filter(function (x) {
      return x.status === "已解除";
    }).length;
    el("mFail").textContent = data.alarms.reduce(function (n, x) {
      return (
        n +
        [x.sms, x.client, x.platform].filter(function (v) {
          return v.indexOf("失败") >= 0;
        }).length
      );
    }, 0);
    el("summary").textContent = "（当前查询 " + rows.length + " 条）";
    el("rows").innerHTML =
      rows
        .map(function (a, i) {
          var o = object(a.objectId),
            p = project(a.projectId),
            acts =
              '<button class="action" data-act="view" data-id="' +
              a.id +
              '">查看</button>';
          if (a.status === "待确认")
            acts +=
              '<button class="action" data-act="handle" data-id="' +
              a.id +
              '">确认预警</button>';
          if (a.status === "处理中")
            acts +=
              '<button class="action" data-act="handle" data-id="' +
              a.id +
              '">完成处置</button>';
          return (
            "<tr><td>" +
            acts +
            "</td><td>" +
            (i + 1) +
            "</td><td>" +
            a.time +
            "</td><td>" +
            esc(o.department) +
            "</td><td>" +
            esc(o.name) +
            "</td><td>" +
            esc(p.name) +
            "</td><td>" +
            a.value +
            " " +
            p.unit +
            "</td><td>" +
            tag(a.level) +
            "</td><td>" +
            a.duration +
            "</td><td>" +
            tag(a.sound) +
            "</td><td>" +
            tag(a.sms) +
            "</td><td>" +
            tag(a.client) +
            "</td><td>" +
            tag(a.platform) +
            "</td><td>" +
            tag(a.status) +
            '</td><td title="' +
            esc(a.content) +
            '">' +
            esc(a.content) +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="15" class="empty">暂无符合条件的智能预警</td></tr>';
  }
  function details(a) {
    var o = object(a.objectId),
      p = project(a.projectId),
      items = [
        ["预警时间", a.time],
        ["所属科室", o.department],
        ["监测对象", o.name],
        ["环境项目", p.name],
        ["监测结果", a.value + " " + p.unit],
        ["预警等级", a.level],
        ["持续时长", a.duration],
        ["处置状态", a.status],
        ["声光报警", a.sound],
        ["短信通知", a.sms],
        ["客户端通知", a.client],
        ["平台推送", a.platform],
        ["预警内容", a.content, "full"],
      ];
    return (
      '<div class="detail-grid">' +
      items
        .map(function (x) {
          return (
            '<div class="detail-item ' +
            (x[2] || "") +
            '"><span>' +
            x[0] +
            "</span><strong>" +
            esc(x[1]) +
            "</strong></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }
  function open(id, handle) {
    active = data.alarms.find(function (x) {
      return x.id === id;
    });
    el("modalTitle").textContent = handle
      ? active.status === "待确认"
        ? "确认环境预警"
        : "完成预警处置"
      : "查看环境预警";
    el("modalBody").innerHTML =
      details(active) +
      (handle
        ? '<div class="form-grid" style="margin-top:18px"><label class="field full"><span class="required">处置说明</span><textarea id="fNote" required placeholder="请填写确认情况或处置结果"></textarea></label><label class="field"><span>处置人</span><input id="fUser" value="当前用户" required></label></div>'
        : "");
    el("submit").style.display = handle ? "" : "none";
    el("modal").classList.remove("is-hidden");
  }
  function save() {
    var next = active.status === "待确认" ? "处理中" : "已解除",
      note = el("fNote").value.trim();
    if (!note) {
      toast("请填写处置说明");
      return;
    }
    active.status = next;
    active.handleNote = note;
    active.handler = el("fUser").value;
    active.handleTime = "2026-08-12 12:00:00";
    if (next === "已解除") active.sound = "已解除";
    S.saveAll(data).then(function (v) {
      data = v;
      el("modal").classList.add("is-hidden");
      filter();
      toast(next === "处理中" ? "预警已确认并进入处理" : "预警处置已完成");
    });
  }
  document.body.onclick = function (e) {
    var a = e.target.dataset.act,
      id = e.target.dataset.id;
    if (e.target.dataset.close !== undefined)
      el("modal").classList.add("is-hidden");
    if (a === "view") open(id, false);
    if (a === "handle") open(id, true);
  };
  el("form").onsubmit = function (e) {
    e.preventDefault();
    save();
  };
  el("search").onclick = filter;
  el("reset").onclick = function () {
    document.querySelectorAll(".query-panel select").forEach(function (x) {
      x.selectedIndex = 0;
    });
    filter();
  };
  S.loadAll().then(function (v) {
    data = v;
    init();
    filter();
  });
})();
