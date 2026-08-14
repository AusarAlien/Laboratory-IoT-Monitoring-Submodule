(function (global) {
  "use strict";
  var S = global.SyswljkQueryService,
    devices = [],
    rows = [],
    statRows = [],
    page = 1,
    PAGE = 10,
    total = 0,
    charts = {};
  var METRICS = {
    温湿度监测设备: [
      ["TEMP", "温度", "℃"],
      ["HUM", "湿度", "%RH"],
    ],
    设备能耗监测设备: [
      ["POWER", "功率", "kW"],
      ["CURRENT", "电流", "A"],
      ["VOLTAGE", "电压", "V"],
      ["ENERGY", "总能耗", "kWh"],
      ["DURATION", "总使用时长", "h"],
      ["POWER_FACTOR", "功率因数", ""],
    ],
  };
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
  function val(id) {
    return el(id).value.trim();
  }
  function toast(m) {
    var n = el("toast");
    n.textContent = m;
    n.classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      n.classList.add("is-hidden");
    }, 2200);
  }
  function dt(v, end) {
    return v ? v + (end ? " 23:59:59" : " 00:00:00") : null;
  }
  function chart(id) {
    return charts[id] || (charts[id] = global.echarts.init(el(id)));
  }
  function metric(c) {
    var all = Object.keys(METRICS).reduce(function (a, k) {
      return a.concat(METRICS[k]);
    }, []);
    return (
      all.find(function (x) {
        return x[0] === c;
      }) || [c, c, ""]
    );
  }
  function params(prefix) {
    var stat = prefix === "stat";
    return {
      startTime: dt(val(prefix + "Start"), false),
      endTime: dt(val(prefix + "End"), true),
      type: val(prefix + "Type"),
      device: stat ? null : val("queryDevice"),
      dept: stat ? null : val("queryArea"),
      metric: val(prefix + "Item"),
      status: stat ? null : val("queryStatus"),
      page: page,
      pageSize: PAGE,
    };
  }
  function setMetricOptions(prefix) {
    var type = val(prefix + "Type"),
      list = METRICS[type] || [],
      select = el(prefix + "Item"),
      old = select.value;
    select.innerHTML = list
      .map(function (x) {
        return '<option value="' + x[0] + '">' + x[1] + "</option>";
      })
      .join("");
    if (
      list.some(function (x) {
        return x[0] === old;
      })
    )
      select.value = old;
  }
  function setDeviceOptions() {
    var type = val("queryType"),
      list = devices.filter(function (d) {
        return d.type === type;
      }),
      depts = [];
    el("queryDevice").innerHTML =
      '<option value="">全部设备</option>' +
      list
        .map(function (d) {
          if (depts.indexOf(d.dept) < 0) depts.push(d.dept);
          return (
            '<option value="' + esc(d.id) + '">' + esc(d.name) + "</option>"
          );
        })
        .join("");
    el("queryArea").innerHTML =
      '<option value="">全部科室</option>' +
      depts
        .sort()
        .map(function (d) {
          return "<option>" + esc(d) + "</option>";
        })
        .join("");
  }
  function options() {
    setMetricOptions("query");
    setMetricOptions("stat");
    setDeviceOptions();
  }
  function tag(v) {
    return (
      '<span class="tag ' +
      (v === "正常"
        ? "tag-success"
        : v === "超限"
          ? "tag-danger"
          : "tag-muted") +
      '">' +
      esc(v) +
      "</span>"
    );
  }
  function renderTable() {
    el("queryRows").innerHTML = rows
      .map(function (r, i) {
        return (
          '<tr><td><button class="action" data-detail="' +
          esc(r.id) +
          '">查看</button></td><td>' +
          ((page - 1) * PAGE + i + 1) +
          "</td><td>" +
          esc(r.time) +
          "</td><td>" +
          esc(r.deviceIp) +
          "</td><td>" +
          esc(r.deviceName) +
          "</td><td>" +
          esc(r.deviceType || val("queryType")) +
          "</td><td>" +
          esc(r.dept) +
          "</td><td>" +
          esc(r.metricName) +
          "</td><td>" +
          (r.value == null ? "--" : r.value) +
          "</td><td>" +
          esc(r.unit) +
          "</td><td>" +
          tag(r.status) +
          "</td></tr>"
        );
      })
      .join("");
    el("querySummary").textContent = "（当前查询 " + total + " 条）";
    el("queryEmpty").classList.toggle("is-hidden", rows.length > 0);
    pager();
  }
  function pager() {
    var pages = Math.ceil(total / PAGE),
      h =
        '<button data-dir="-1" ' +
        (page <= 1 ? "disabled" : "") +
        ">‹</button>";
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - page) > 1) {
        if (i === 3) h += "<button disabled>…</button>";
        continue;
      }
      h +=
        '<button data-page="' +
        i +
        '" class="' +
        (i === page ? "is-current" : "") +
        '">' +
        i +
        "</button>";
    }
    h +=
      '<button data-dir="1" ' +
      (page >= pages ? "disabled" : "") +
      ">›</button><span>共 " +
      pages +
      " 页，" +
      total +
      " 条</span>";
    el("queryPager").innerHTML = h;
  }
  function renderMetrics(s) {
    el("metricRows").textContent = s.total;
    el("metricDevices").textContent = s.devices;
    el("metricItems").textContent = s.metrics;
    el("metricNormal").textContent = s.normal;
    el("metricAlarm").textContent = s.alarm;
  }
  function renderCharts(trend, s) {
    var m = metric(val("queryItem")),
      name = m[1],
      unit = m[2],
      groups = {};
    trend.forEach(function (r) {
      if (r.value == null) return;
      (groups[r.deviceId] = groups[r.deviceId] || {
        name: r.deviceName,
        data: [],
      }).data.push([r.time.replace(" ", "T"), r.value]);
    });
    el("trendTitle").textContent =
      name + "趋势" + (unit ? "（" + unit + "）" : "");
    el("trendEmpty").classList.toggle("is-hidden", trend.length > 0);
    var tc = chart("trendChart");
    tc.clear();
    tc.setOption({
      tooltip: {
        trigger: "axis",
        valueFormatter: function (v) {
          return v == null ? "--" : v + (unit ? " " + unit : "");
        },
      },
      legend: { top: 8, type: "scroll" },
      grid: { left: 82, right: 24, top: 52, bottom: 62 },
      xAxis: {
        type: "time",
        name: "监测时间",
        nameLocation: "middle",
        nameGap: 48,
      },
      yAxis: {
        type: "value",
        name: name + (unit ? "（" + unit + "）" : ""),
        nameLocation: "middle",
        nameGap: 62,
      },
      series: Object.keys(groups).map(function (k) {
        return {
          name: groups[k].name,
          type: "line",
          smooth: false,
          showSymbol: true,
          symbolSize: 5,
          data: groups[k].data,
        };
      }),
    });
    chart("statusChart").setOption({
      tooltip: { trigger: "item" },
      legend: { bottom: 12 },
      series: [
        {
          type: "pie",
          radius: ["42%", "67%"],
          center: ["50%", "45%"],
          data: [
            { name: "正常", value: s.normal },
            { name: "超限", value: s.alarm },
            { name: "无效", value: s.invalid },
          ],
          color: ["#07956a", "#df4b57", "#a0a9b5"],
          label: { formatter: "{b}\n{c}条" },
        },
      ],
    });
  }
  function query() {
    var p = params("query");
    Promise.all([S.loadRows(p), S.loadSummary(p), S.loadTrend(p)])
      .then(function (v) {
        rows = v[0];
        total = rows.length ? rows[0].total : v[1].total;
        renderTable();
        renderMetrics(v[1]);
        renderCharts(v[2], v[1]);
      })
      .catch(function () {
        rows = [];
        total = 0;
        renderTable();
        renderMetrics({
          total: 0,
          devices: 0,
          metrics: 0,
          normal: 0,
          alarm: 0,
        });
        renderCharts([], { normal: 0, alarm: 0, invalid: 0 });
        toast("数据加载失败，请稍后重试");
      });
  }
  function groupLabel(r, k) {
    return k === "area"
      ? r.dept
      : k === "type"
        ? r.deviceType
        : k === "device"
          ? r.deviceName
          : k === "item"
            ? r.metricName
            : r.time.slice(0, 10);
  }
  function aggregate(a, m) {
    var nums = a
      .filter(function (r) {
        return r.value != null;
      })
      .map(function (r) {
        return r.value;
      });
    if (m === "count") return a.length;
    if (m === "alarmRate")
      return a.length
        ? Number(
            (
              (a.filter(function (r) {
                return r.status === "超限";
              }).length *
                100) /
              a.length
            ).toFixed(1),
          )
        : 0;
    if (!nums.length) return null;
    if (m === "avg")
      return Number(
        (
          nums.reduce(function (x, y) {
            return x + y;
          }, 0) / nums.length
        ).toFixed(4),
      );
    if (m === "delta")
      return Number(
        (Math.max.apply(null, nums) - Math.min.apply(null, nums)).toFixed(4),
      );
    return m === "max"
      ? Math.max.apply(null, nums)
      : Math.min.apply(null, nums);
  }
  function runStatistics() {
    var p = params("stat");
    p.page = 1;
    p.pageSize = 5000;
    S.loadRows(p)
      .then(function (all) {
        var by = {},
          g = val("groupBy"),
          a = val("aggregate");
        all.forEach(function (r) {
          var k = groupLabel(r, g);
          (by[k] = by[k] || []).push(r);
        });
        statRows = Object.keys(by)
          .sort()
          .map(function (k) {
            return {
              group: k,
              value: aggregate(by[k], a),
              count: by[k].length,
              alarm: by[k].filter(function (r) {
                return r.status === "超限";
              }).length,
            };
          })
          .filter(function (x) {
            return x.value != null;
          });
        renderStatistics(g, a);
      })
      .catch(function () {
        toast("统计数据加载失败，请稍后重试");
      });
  }
  function renderStatistics(g, a) {
    var gn = {
        area: "所属科室",
        type: "设备类型",
        device: "设备名称",
        item: "监测指标",
        day: "监测日期",
      },
      an = {
        count: "数据量",
        avg: "平均值",
        max: "最大值",
        min: "最小值",
        delta: "累计增量",
        alarmRate: "超限率（%）",
      };
    el("groupTitle").textContent = gn[g];
    el("valueTitle").textContent = an[a];
    el("statisticsTitle").textContent = gn[g] + " · " + an[a];
    el("statisticsRows").innerHTML = statRows
      .map(function (x, i) {
        return (
          "<tr><td>" +
          (i + 1) +
          "</td><td>" +
          esc(x.group) +
          "</td><td>" +
          x.value +
          "</td><td>" +
          x.count +
          "</td><td>" +
          x.alarm +
          "</td></tr>"
        );
      })
      .join("");
    el("statisticsSummary").textContent = "（共 " + statRows.length + " 组）";
    el("statisticsEmpty").classList.toggle("is-hidden", statRows.length > 0);
    el("customEmpty").classList.toggle("is-hidden", statRows.length > 0);
    var type = val("chartType"),
      c = chart("customChart"),
      series =
        type === "pie"
          ? [
              {
                type: "pie",
                radius: "62%",
                data: statRows.map(function (x) {
                  return { name: x.group, value: x.value };
                }),
                label: { formatter: "{b}: {c}" },
              },
            ]
          : [
              {
                type: type,
                data: statRows.map(function (x) {
                  return x.value;
                }),
                smooth: false,
                itemStyle: { color: "#2878f0" },
              },
            ];
    c.clear();
    c.setOption({
      tooltip: { trigger: type === "pie" ? "item" : "axis" },
      grid: { left: 70, right: 25, top: 35, bottom: 75 },
      xAxis:
        type === "pie"
          ? undefined
          : {
              type: "category",
              data: statRows.map(function (x) {
                return x.group;
              }),
              axisLabel: { rotate: 25 },
            },
      yAxis: type === "pie" ? undefined : { type: "value", name: an[a] },
      series: series,
    });
  }
  function detail(id) {
    var r = rows.find(function (x) {
      return x.id === id;
    });
    if (!r) return;
    var range =
        r.lower == null && r.upper == null
          ? "--"
          : (r.lower == null ? "--" : r.lower) +
            " ～ " +
            (r.upper == null ? "--" : r.upper) +
            " " +
            r.unit,
      a = [
        ["监测时间", r.time],
        ["设备编号", r.deviceIp],
        ["设备名称", r.deviceName],
        ["设备类型", r.deviceType],
        ["所属科室", r.dept],
        ["监测指标", r.metricName],
        [
          "监测值",
          (r.value == null ? "--" : r.value) + (r.unit ? " " + r.unit : ""),
        ],
        ["标准范围", range],
        ["数据状态", r.status],
        ["异常说明", r.alarm || "--"],
      ];
    el("detailBody").innerHTML = a
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
    el("detailModal").classList.remove("is-hidden");
  }
  function csv() {
    if (!rows.length) {
      toast("当前没有可导出的数据");
      return;
    }
    var out = [
        [
          "监测时间",
          "设备编号",
          "设备名称",
          "设备类型",
          "所属科室",
          "监测指标",
          "监测值",
          "单位",
          "数据状态",
        ],
      ]
        .concat(
          rows.map(function (r) {
            return [
              r.time,
              r.deviceIp,
              r.deviceName,
              r.deviceType,
              r.dept,
              r.metricName,
              r.value,
              r.unit,
              r.status,
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
      link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob(["\ufeff" + out], { type: "text/csv;charset=utf-8" }),
    );
    link.download = "物联监控数据.csv";
    link.click();
    setTimeout(function () {
      URL.revokeObjectURL(link.href);
    }, 0);
  }
  document.querySelector(".page-tabs").onclick = function (e) {
    var t = e.target.dataset.tab;
    if (!t) return;
    document.querySelectorAll(".page-tab").forEach(function (n) {
      n.classList.toggle("is-active", n.dataset.tab === t);
    });
    document.querySelectorAll(".tab-panel").forEach(function (n) {
      n.classList.add("is-hidden");
    });
    el(t + "Panel").classList.remove("is-hidden");
    setTimeout(function () {
      Object.keys(charts).forEach(function (k) {
        charts[k].resize();
      });
    }, 0);
  };
  document.body.onclick = function (e) {
    var n = e.target;
    if (n.dataset.close !== undefined)
      el("detailModal").classList.add("is-hidden");
    else if (n.dataset.search === "query") {
      page = 1;
      query();
    } else if (n.dataset.detail) detail(n.dataset.detail);
    else if (n.dataset.page) {
      page = Number(n.dataset.page);
      query();
    } else if (n.dataset.dir) {
      page = Math.max(1, page + Number(n.dataset.dir));
      query();
    } else if (n.dataset.reset) {
      if (n.dataset.reset === "query") {
        el("queryStart").value = "";
        el("queryEnd").value = "";
        el("queryType").value = "设备能耗监测设备";
        setMetricOptions("query");
        setDeviceOptions();
        el("queryStatus").value = "";
        page = 1;
        query();
      } else {
        el("statStart").value = "";
        el("statEnd").value = "";
        el("statType").value = "设备能耗监测设备";
        setMetricOptions("stat");
        el("groupBy").value = "area";
        el("aggregate").value = "count";
        el("chartType").value = "bar";
        runStatistics();
      }
    }
  };
  el("queryType").onchange = function () {
    setMetricOptions("query");
    setDeviceOptions();
    page = 1;
    query();
  };
  el("statType").onchange = function () {
    setMetricOptions("stat");
    runStatistics();
  };
  el("runStatistics").onclick = runStatistics;
  el("exportQuery").onclick = csv;
  global.addEventListener("resize", function () {
    Object.keys(charts).forEach(function (k) {
      charts[k].resize();
    });
  });
  S.loadDevices()
    .then(function (v) {
      devices = v;
      options();
      query();
      runStatistics();
    })
    .catch(function () {
      toast("数据加载失败，请稍后重试");
    });
})(window);
