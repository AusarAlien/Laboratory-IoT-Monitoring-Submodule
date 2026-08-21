(function (global) {
  "use strict";
  var S = global.SyswljkWsdService,
    devices = [],
    projects = [],
    rows = [],
    summary = {},
    chart,
    page = 1,
    pageSize = 20;
  function el(id) {
    return document.getElementById(id);
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
  function toast(m) {
    el("toast").textContent = m;
    el("toast").classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      el("toast").classList.add("is-hidden");
    }, 2000);
  }
  function dateTime(v, end) {
    return v ? v + (end ? " 23:59:59" : " 00:00:00") : null;
  }
  function params() {
    return {
      startTime: dateTime(el("qStart").value, false),
      endTime: dateTime(el("qEnd").value, true),
      dept: el("qDept").value,
      device: el("qObject").value,
      metric: el("qProject").value,
      status: el("qStatus").value,
      page: page,
      pageSize: pageSize,
    };
  }
  function options() {
    var depts = [];
    devices.forEach(function (d) {
      if (depts.indexOf(d.dept) < 0) depts.push(d.dept);
    });
    el("qProject").innerHTML = '<option value="">全部项目</option>';
    projects.forEach(function (p) {
      el("qProject").insertAdjacentHTML("beforeend", '<option value="' + esc(p.code) + '">' + esc(p.name) + "</option>");
    });
    depts.sort().forEach(function (x) {
      el("qDept").insertAdjacentHTML(
        "beforeend",
        '<option value="' + esc(x) + '">' + esc(x) + "</option>",
      );
    });
    devices.forEach(function (d) {
      el("qObject").insertAdjacentHTML(
        "beforeend",
        '<option value="' + esc(d.id) + '">' + esc(d.name) + "</option>",
      );
    });
  }
  function tag(s) {
    return (
      '<span class="tag ' +
      (s === "正常" || s === "合格" ? "tag-success" : s === "超限" || s === "不合格" ? "tag-danger" : "") +
      '">' +
      esc(s) +
      "</span>"
    );
  }
  function render() {
    var total = rows.length ? rows[0].total : 0;
    el("summary").textContent = "（当前查询 " + total + " 条）";
    el("rows").innerHTML =
      rows
        .map(function (r, i) {
          return (
            '<tr><td><button class="action" data-view="' +
            esc(r.id) +
            '">查看</button></td><td>' +
            ((page - 1) * pageSize + i + 1) +
            "</td><td>" +
            esc(r.time) +
            "</td><td>" +
            esc(r.dept) +
            "</td><td>" +
            esc(r.deviceName) +
            "</td><td>" +
            esc(r.deviceIp) +
            "</td><td>" +
            esc(r.metricName) +
            "</td><td>" +
            (r.rawValue || (r.value == null ? "--" : r.value)) +
            "</td><td>" +
            esc(r.unit) +
            "</td><td>" +
            tag(r.status) +
            "</td><td>" +
            (r.lower == null ? "--" : r.lower) +
            "</td><td>" +
            (r.upper == null ? "--" : r.upper) +
            "</td><td>" +
            esc(r.alarm || "--") +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="13" class="empty">暂无符合条件的环境记录</td></tr>';
    el("mTotal").textContent = summary.total || 0;
    el("mDevices").textContent = summary.devices || 0;
    el("mMetrics").textContent = summary.metrics || 0;
    el("mNormal").textContent = summary.normal || 0;
    el("mBad").textContent = summary.alarm || 0;
    renderPager(total);
  }
  function renderPager(total) {
    var pages = Math.ceil(total / pageSize),
      html = '<button data-dir="-1" ' + (page <= 1 ? "disabled" : "") + ">‹</button>";
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
        if (i === 3) html += "<button disabled>…</button>";
        continue;
      }
      html += '<button data-page="' + i + '" class="' + (i === page ? "is-current" : "") + '">' + i + "</button>";
    }
    html += '<button data-dir="1" ' + (page >= pages ? "disabled" : "") + ">›</button><span>共 " + pages + " 页，" + total + " 条</span>";
    el("recordPager").innerHTML = html;
  }
  function trend(list) {
    var code = el("qProject").value || (projects[0] ? projects[0].code : ""),
      project = projects.find(function (x) { return x.code === code; }) || {},
      first = list.find(function (x) { return x.metricCode === code; }) || {},
      name = project.name || first.metricName || "环境指标",
      unit = project.unit || first.unit || "",
      groups = {};
    list
      .filter(function (r) {
        return r.metricCode === code;
      })
      .forEach(function (r) {
        (groups[r.deviceId] = groups[r.deviceId] || {
          name: r.deviceName,
          data: [],
        }).data.push([r.time.replace(" ", "T"), r.value]);
      });
    el("trendTitle").textContent = name + "变化趋势（" + unit + "）";
    if (!chart) chart = global.echarts.init(el("trendChart"));
    chart.clear();
    chart.setOption(
      {
        tooltip: {
          trigger: "axis",
          valueFormatter: function (v) {
            return v == null ? "--" : v + " " + unit;
          },
        },
        legend: { top: 6, type: "scroll" },
        grid: { left: 78, right: 30, top: 55, bottom: 62 },
        xAxis: {
          type: "time",
          name: "记录时间",
          nameLocation: "middle",
          nameGap: 44,
        },
        yAxis: {
          type: "value",
          name: name + "（" + unit + "）",
          nameLocation: "middle",
          nameGap: 55,
        },
        series: Object.keys(groups).map(function (k) {
          return {
            name: groups[k].name,
            type: "line",
            smooth: true,
            showSymbol: true,
            symbolSize: 5,
            data: groups[k].data,
          };
        }),
      },
      true,
    );
  }
  function load() {
    var p = params();
    Promise.all([S.loadRecords(p), S.loadSummary(p), S.loadTrend(p)])
      .then(function (v) {
        rows = v[0];
        summary = v[1];
        render();
        trend(v[2]);
      })
      .catch(function () {
        rows = [];
        summary = {};
        render();
        toast("数据加载失败，请稍后重试");
      });
  }
  function detail(id) {
    var r = rows.find(function (x) {
      return x.id === id;
    });
    if (!r) return;
    var a = [
      ["记录时间", r.time],
      ["所属实验室", r.dept],
      ["监测对象", r.deviceName],
      ["对象编号", r.deviceIp],
      ["环境项目", r.metricName],
      ["记录值", (r.rawValue || (r.value == null ? "--" : r.value)) + " " + r.unit],
      ["下限", r.lower == null ? "--" : r.lower],
      ["上限", r.upper == null ? "--" : r.upper],
      ["状态", r.status],
      ["异常说明", r.alarm || "--"],
      ["备注", r.remark || "--"],
    ];
    el("modalTitle").textContent = "环境记录详情";
    el("modalBody").innerHTML =
      '<div class="detail-grid">' +
      a
        .map(function (x) {
          return (
            '<div class="detail-item"><span>' +
            x[0] +
            "</span><strong>" +
            esc(x[1]) +
            "</strong></div>"
          );
        })
        .join("") +
      "</div>";
    el("submit").style.display = "none";
    el("modal").classList.remove("is-hidden");
  }
  function csv() {
    if (!rows.length) {
      toast("当前没有可导出的数据");
      return;
    }
    var out = [
        [
          "记录时间",
          "所属科室",
          "监测对象",
          "设备编号",
          "环境项目",
          "记录值",
          "单位",
          "下限",
          "上限",
          "状态",
          "异常说明",
        ],
      ]
        .concat(
          rows.map(function (r) {
            return [
              r.time,
              r.dept,
              r.deviceName,
              r.deviceIp,
              r.metricName,
              r.value,
              r.unit,
              r.lower,
              r.upper,
              r.status,
              r.alarm,
            ];
          }),
        )
        .map(function (a) {
          return a
            .map(function (v) {
              return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
            })
            .join(",");
        })
        .join("\r\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + out], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "环境记录.csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }
  document.body.onclick = function (e) {
    if (e.target.dataset.close !== undefined)
      el("modal").classList.add("is-hidden");
    else if (e.target.dataset.view) detail(e.target.dataset.view);
    else if (e.target.dataset.page) {
      page = Number(e.target.dataset.page);
      load();
    } else if (e.target.dataset.dir) {
      page = Math.max(1, page + Number(e.target.dataset.dir));
      load();
    }
  };
  el("form").onsubmit = function (e) {
    e.preventDefault();
  };
  el("export").onclick = csv;
  el("search").onclick = function () {
    page = 1;
    load();
  };
  el("qProject").onchange = function () {
    page = 1;
    load();
  };
  el("reset").onclick = function () {
    ["qStart", "qEnd", "qDept", "qObject", "qProject", "qStatus"].forEach(
      function (id) {
        el(id).value = "";
      },
    );
    page = 1;
    load();
  };
  global.addEventListener("resize", function () {
    if (chart) chart.resize();
  });
  Promise.all([S.loadDevices(), S.loadStandards()])
    .then(function (v) {
      devices = v[0];
      projects = v[1].filter(function (x) { return x.statusCode !== "0"; });
      options();
      load();
    })
    .catch(function () {
      toast("数据加载失败，请稍后重试");
    });
})(window);
