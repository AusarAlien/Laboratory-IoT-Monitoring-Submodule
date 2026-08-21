(function (global) {
  "use strict";
  var S = global.SyswljkWsdService,
    devices = [],
    projects = [],
    rows = [],
    chart;
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
  function toast(message) {
    var old = document.querySelector(".wsd-message");
    if (old) old.remove();
    var n = document.createElement("div");
    n.className = "toast wsd-message";
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(function () {
      n.remove();
    }, 2200);
  }
  function params() {
    return {
      dept: el("qDept").value,
      device: el("qObject").value,
      metric: el("qProject").value,
      status: el("qStatus").value,
    };
  }
  function addOptions(id, list, value, text) {
    list.forEach(function (x) {
      var o = document.createElement("option");
      o.value = x[value];
      o.textContent = x[text];
      el(id).appendChild(o);
    });
  }
  function initOptions() {
    var depts = [];
    devices.forEach(function (d) {
      if (depts.indexOf(d.dept) < 0) depts.push(d.dept);
    });
    addOptions(
      "qDept",
      depts.sort().map(function (x) {
        return { v: x, t: x };
      }),
      "v",
      "t",
    );
    addOptions("qObject", devices, "id", "name");
    el("qProject").innerHTML = "";
    addOptions("qProject", projects, "code", "name");
  }
  function range(r) {
    return (
      (r.lower == null ? "--" : r.lower) +
      " ～ " +
      (r.upper == null ? "--" : r.upper) +
      " " +
      r.unit
    );
  }
  function tag(status) {
    return (
      '<span class="tag ' +
      (status === "正常" || status === "合格"
        ? "tag-success"
        : status === "超限" || status === "不合格"
          ? "tag-danger"
          : "") +
      '">' +
      esc(status) +
      "</span>"
    );
  }
  function renderTable() {
    el("resultCount").textContent = "（当前查询 " + rows.length + " 条）";
    el("resultBody").innerHTML =
      rows
        .map(function (r, i) {
          return (
            '<tr><td><button class="action" data-view="' +
            esc(r.id) +
            '">查看</button></td><td>' +
            (i + 1) +
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
            esc(range(r)) +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="11" class="empty">暂无符合条件的采集结果</td></tr>';
  }
  function renderChart(trend) {
    var metric = el("qProject").value,
      project = projects.find(function (x) { return x.code === metric; }) || {},
      first = trend.find(function (x) { return !metric || x.metricCode === metric; }) || {},
      name = project.name || first.metricName || "环境指标",
      unit = project.unit || first.unit || "",
      groups = {};
    trend.forEach(function (r) {
      (groups[r.deviceId] = groups[r.deviceId] || {
        name: r.deviceName,
        data: [],
      }).data.push([r.time.replace(" ", "T"), r.value]);
    });
    el("trendTitle").textContent = name + "趋势（" + unit + "）";
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
        legend: { top: 10, type: "scroll" },
        grid: { left: 78, right: 28, top: 58, bottom: 66 },
        xAxis: {
          type: "time",
          name: "采集时间",
          nameLocation: "middle",
          nameGap: 48,
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
  function renderMetrics(summary) {
    el("mObjects").textContent = devices.length;
    el("mDevices").textContent = devices.length;
    el("mToday").textContent = summary.today;
    el("mNormal").textContent = rows.filter(function (r) {
      return r.status === "正常" || r.status === "合格";
    }).length;
    el("mAbnormal").textContent = rows.filter(function (r) {
      return r.status === "超限" || r.status === "不合格";
    }).length;
  }
  function load() {
    var p = params();
    Promise.all([S.loadLatest(p), S.loadTrend(p), S.loadSummary(p)])
      .then(function (v) {
        rows = v[0];
        renderTable();
        renderChart(v[1]);
        renderMetrics(v[2]);
      })
      .catch(function () {
        rows = [];
        renderTable();
        toast("数据加载失败，请稍后重试");
      });
  }
  function detail(id) {
    var r = rows.find(function (x) {
      return x.id === id;
    });
    if (!r) return;
    var items = [
      ["采集时间", r.time],
      ["所属实验室", r.dept],
      ["监测对象", r.deviceName],
      ["对象编号", r.deviceIp],
      ["环境项目", r.metricName],
      ["采集结果", (r.rawValue || (r.value == null ? "--" : r.value)) + " " + r.unit],
      ["标准范围", range(r)],
      ["数据状态", r.status],
      ["异常说明", r.alarm || "--"],
    ];
    el("detailContent").innerHTML = items
      .map(function (x) {
        return (
          '<div class="detail-item"><span>' +
          x[0] +
          "</span><strong>" +
          esc(x[1]) +
          "</strong></div>"
        );
      })
      .join("");
    el("modal").classList.remove("is-hidden");
  }
  document.body.onclick = function (e) {
    if (e.target.dataset.close !== undefined)
      el("modal").classList.add("is-hidden");
    if (e.target.dataset.view) detail(e.target.dataset.view);
  };
  el("btnSearch").onclick = load;
  el("qProject").onchange = load;
  el("btnReset").onclick = function () {
    el("qDept").value = "";
    el("qObject").value = "";
    el("qProject").value = projects.length ? projects[0].code : "";
    el("qStatus").value = "";
    load();
  };
  global.addEventListener("resize", function () {
    if (chart) chart.resize();
  });
  Promise.all([S.loadDevices(), S.loadStandards()])
    .then(function (v) {
      devices = v[0];
      projects = v[1].filter(function (x) { return x.statusCode !== "0"; });
      initOptions();
      load();
    })
    .catch(function () {
      toast("数据加载失败，请稍后重试");
    });
})(window);
