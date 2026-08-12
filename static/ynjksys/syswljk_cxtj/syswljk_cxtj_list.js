(function (global) {
  "use strict";
  var S = global.SyswljkQueryService,
    PAGE = 10,
    data = { devices: [], rows: [] },
    filtered = [],
    statRows = [],
    pageNo = 1,
    charts = {};
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
  function title(v) {
    return ' title="' + esc(v || "--") + '"';
  }
  function device(id) {
    return (
      data.devices.find(function (x) {
        return x.id === id;
      }) || {}
    );
  }
  function unique(rows, get) {
    var a = [];
    rows.forEach(function (x) {
      var v = get(x);
      if (a.indexOf(v) < 0) a.push(v);
    });
    return a;
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
  function options() {
    var dev =
        '<option value="">全部设备</option>' +
        data.devices
          .map(function (x) {
            return '<option value="' + x.id + '">' + esc(x.name) + "</option>";
          })
          .join(""),
      types = unique(data.devices, function (x) {
        return x.type;
      }),
      areas = unique(data.devices, function (x) {
        return x.area;
      }),
      items = unique(
        data.rows.filter(function (x) {
          return x.item !== "水浸状态";
        }),
        function (x) {
          return x.item;
        },
      );
    el("queryDevice").innerHTML = dev;
    el("queryType").innerHTML =
      '<option value="">全部类型</option>' +
      types
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("statType").innerHTML = el("queryType").innerHTML;
    el("queryArea").innerHTML =
      '<option value="">全部区域</option>' +
      areas
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("queryItem").innerHTML =
      '<option value="">全部指标</option>' +
      items
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("statItem").innerHTML = el("queryItem").innerHTML;
    el("queryItem").value = items.indexOf("温度") >= 0 ? "温度" : "";
    el("statItem").value = items.indexOf("温度") >= 0 ? "温度" : "";
  }
  function applyFilters(prefix) {
    var isStat = prefix === "stat",
      start = val(prefix + "Start"),
      end = val(prefix + "End"),
      type = val(prefix + "Type"),
      item = val(prefix + "Item");
    return data.rows.filter(function (x) {
      var d = device(x.deviceId),
        day = x.time.slice(0, 10);
      if (x.item === "水浸状态") return false;
      if (start && day < start) return false;
      if (end && day > end) return false;
      if (type && d.type !== type) return false;
      if (item && x.item !== item) return false;
      if (!isStat) {
        if (val("queryDevice") && x.deviceId !== val("queryDevice"))
          return false;
        if (val("queryArea") && d.area !== val("queryArea")) return false;
        if (val("queryStatus") && x.status !== val("queryStatus")) return false;
      }
      return true;
    });
  }
  function query() {
    filtered = applyFilters("query");
    pageNo = 1;
    renderTable();
    renderMetrics();
    renderQueryCharts();
  }
  function renderMetrics() {
    var devs = unique(filtered, function (x) {
        return x.deviceId;
      }),
      items = unique(filtered, function (x) {
        return x.item;
      });
    el("metricRows").textContent = filtered.length;
    el("metricDevices").textContent = devs.length;
    el("metricItems").textContent = items.length;
    el("metricNormal").textContent = filtered.filter(function (x) {
      return x.status === "正常";
    }).length;
    el("metricAlarm").textContent = filtered.filter(function (x) {
      return x.status === "超限";
    }).length;
  }
  function renderTable() {
    var rows = filtered.slice((pageNo - 1) * PAGE, pageNo * PAGE);
    el("queryRows").innerHTML = rows
      .map(function (x, i) {
        var d = device(x.deviceId);
        return (
          '<tr><td><button class="action" data-detail="' +
          x.id +
          '">查看</button></td><td>' +
          ((pageNo - 1) * PAGE + i + 1) +
          "</td><td>" +
          esc(x.time) +
          "</td><td>" +
          esc(d.code) +
          "</td><td" +
          title(d.name) +
          ">" +
          esc(d.name) +
          "</td><td>" +
          esc(d.type) +
          "</td><td>" +
          esc(d.area) +
          "</td><td>" +
          esc(x.item) +
          "</td><td>" +
          x.value +
          "</td><td>" +
          esc(x.unit || "--") +
          "</td><td>" +
          tag(x.status) +
          "</td></tr>"
        );
      })
      .join("");
    el("querySummary").textContent = "（当前查询 " + filtered.length + " 条）";
    el("queryEmpty").classList.toggle("is-hidden", filtered.length > 0);
    pager();
  }
  function pager() {
    var pages = Math.ceil(filtered.length / PAGE),
      h =
        '<button data-dir="-1" ' +
        (pageNo <= 1 ? "disabled" : "") +
        ">‹</button>";
    for (var i = 1; i <= pages; i++) {
      if (pages > 7 && i > 2 && i < pages - 1 && Math.abs(i - pageNo) > 1) {
        if (i === 3) h += "<button disabled>…</button>";
        continue;
      }
      h +=
        '<button data-page="' +
        i +
        '" class="' +
        (i === pageNo ? "is-current" : "") +
        '">' +
        i +
        "</button>";
    }
    h +=
      '<button data-dir="1" ' +
      (pageNo >= pages ? "disabled" : "") +
      ">›</button><span>共 " +
      pages +
      " 页，" +
      filtered.length +
      " 条</span>";
    el("queryPager").innerHTML = h;
  }
  function initChart(id) {
    if (!charts[id]) charts[id] = global.echarts.init(el(id));
    return charts[id];
  }
  function renderQueryCharts() {
    var item = val("queryItem"),
      numeric = filtered.filter(function (x) {
        return typeof x.value === "number" && x.item === item;
      }),
      trend = initChart("trendChart"),
      status = initChart("statusChart"),
      unit = numeric.length ? numeric[0].unit : "",
      groups = {};
    numeric.forEach(function (x) {
      (groups[x.deviceId] = groups[x.deviceId] || []).push([
        x.time.replace(" ", "T"),
        x.value,
      ]);
    });
    Object.keys(groups).forEach(function (id) {
      groups[id].sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      });
    });
    el("trendTitle").textContent = item
      ? item + "趋势" + (unit ? "（" + unit + "）" : "")
      : "监测数据趋势";
    el("trendEmpty").textContent = item
      ? "暂无可绘制的" + item + "数值数据"
      : "请选择一个具体的数值指标查看趋势";
    el("trendEmpty").classList.toggle(
      "is-hidden",
      !!item && numeric.length > 0,
    );
    trend.clear();
    if (item && numeric.length) {
      trend.setOption({
        tooltip: {
          trigger: "axis",
          valueFormatter: function (v) {
            return v == null ? "--" : v + (unit ? " " + unit : "");
          },
        },
        legend: { top: 8, type: "scroll" },
        grid: { left: 76, right: 24, top: 52, bottom: 62 },
        xAxis: {
          type: "time",
          name: "监测时间",
          nameLocation: "middle",
          nameGap: 48,
          axisLabel: {
            rotate: 25,
            formatter: function (value) {
              var date = new Date(value),
                pad = function (n) {
                  return String(n).padStart(2, "0");
                };
              return (
                pad(date.getMonth() + 1) +
                "-" +
                pad(date.getDate()) +
                " " +
                pad(date.getHours()) +
                ":" +
                pad(date.getMinutes())
              );
            },
          },
        },
        yAxis: {
          type: "value",
          name: item + (unit ? "（" + unit + "）" : ""),
          nameLocation: "middle",
          nameGap: 56,
        },
        series: Object.keys(groups).map(function (id) {
          var d = device(id);
          return {
            name: d.name || id,
            type: "line",
            smooth: true,
            showSymbol: true,
            symbolSize: 6,
            data: groups[id],
          };
        }),
      });
    }
    var statuses = ["正常", "超限", "无效"].map(function (s) {
      return {
        name: s,
        value: filtered.filter(function (x) {
          return x.status === s;
        }).length,
      };
    });
    status.setOption({
      tooltip: { trigger: "item" },
      legend: { bottom: 12 },
      series: [
        {
          type: "pie",
          radius: ["42%", "67%"],
          center: ["50%", "45%"],
          data: statuses,
          color: ["#07956a", "#df4b57", "#a0a9b5"],
          label: { formatter: "{b}\n{c}条" },
        },
      ],
    });
  }
  function groupLabel(row, key) {
    var d = device(row.deviceId);
    return key === "area"
      ? d.area
      : key === "type"
        ? d.type
        : key === "device"
          ? d.name
          : key === "item"
            ? row.item
            : row.time.slice(0, 10);
  }
  function aggregate(rows, mode) {
    var nums = rows
      .filter(function (x) {
        return typeof x.value === "number";
      })
      .map(function (x) {
        return x.value;
      });
    if (mode === "count") return rows.length;
    if (mode === "alarmRate")
      return rows.length
        ? Number(
            (
              (rows.filter(function (x) {
                return x.status === "超限";
              }).length *
                100) /
              rows.length
            ).toFixed(1),
          )
        : 0;
    if (!nums.length) return null;
    if (mode === "avg")
      return Number(
        (
          nums.reduce(function (a, b) {
            return a + b;
          }, 0) / nums.length
        ).toFixed(2),
      );
    if (mode === "max") return Math.max.apply(null, nums);
    return Math.min.apply(null, nums);
  }
  function runStatistics() {
    var rows = applyFilters("stat"),
      group = val("groupBy"),
      mode = val("aggregate"),
      map = {};
    rows.forEach(function (x) {
      var k = groupLabel(x, group);
      (map[k] = map[k] || []).push(x);
    });
    statRows = Object.keys(map)
      .sort()
      .map(function (k) {
        return {
          group: k,
          value: aggregate(map[k], mode),
          count: map[k].length,
          alarm: map[k].filter(function (x) {
            return x.status === "超限";
          }).length,
        };
      })
      .filter(function (x) {
        return x.value !== null;
      });
    renderStatistics(group, mode);
  }
  function renderStatistics(group, mode) {
    var groupNames = {
        area: "所属区域",
        type: "设备类型",
        device: "设备名称",
        item: "监测指标",
        day: "监测日期",
      },
      valueNames = {
        count: "数据量",
        avg: "平均值",
        max: "最大值",
        min: "最小值",
        alarmRate: "超限率（%）",
      };
    el("groupTitle").textContent = groupNames[group];
    el("valueTitle").textContent = valueNames[mode];
    el("statisticsTitle").textContent =
      groupNames[group] + " · " + valueNames[mode];
    el("statisticsRows").innerHTML = statRows
      .map(function (x, i) {
        return (
          "<tr><td>" +
          (i + 1) +
          "</td><td" +
          title(x.group) +
          ">" +
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
      chart = initChart("customChart"),
      series;
    if (type === "pie")
      series = [
        {
          type: "pie",
          radius: "62%",
          data: statRows.map(function (x) {
            return { name: x.group, value: x.value };
          }),
          label: { formatter: "{b}: {c}" },
        },
      ];
    else
      series = [
        {
          type: type,
          data: statRows.map(function (x) {
            return x.value;
          }),
          itemStyle: { color: "#2878f0" },
          smooth: true,
        },
      ];
    chart.clear();
    chart.setOption({
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
      yAxis:
        type === "pie" ? undefined : { type: "value", name: valueNames[mode] },
      series: series,
    });
  }
  function detail(id) {
    var x = data.rows.find(function (r) {
        return r.id === id;
      }),
      d = device(x.deviceId),
      items = [
        ["监测时间", x.time],
        ["设备编号", d.code],
        ["设备名称", d.name],
        ["设备类型", d.type],
        ["所属区域", d.area],
        ["监测指标", x.item],
        ["监测值", x.value + " " + x.unit],
        ["数据状态", x.status],
        ["数据来源", x.source],
        ["采集批次", x.batch, "full"],
      ];
    el("detailBody").innerHTML = items
      .map(function (v) {
        return (
          '<div class="detail-item ' +
          (v[2] || "") +
          '"><span>' +
          v[0] +
          "</span><strong>" +
          esc(v[1]) +
          "</strong></div>"
        );
      })
      .join("");
    el("detailModal").classList.remove("is-hidden");
  }
  function csv() {
    if (!filtered.length) {
      toast("当前没有可导出的数据");
      return;
    }
    var out = [
        [
          "监测时间",
          "设备编号",
          "设备名称",
          "设备类型",
          "所属区域",
          "监测指标",
          "监测值",
          "单位",
          "数据状态",
        ],
      ]
        .concat(
          filtered.map(function (x) {
            var d = device(x.deviceId);
            return [
              x.time,
              d.code,
              d.name,
              d.type,
              d.area,
              x.item,
              x.value,
              x.unit,
              x.status,
            ];
          }),
        )
        .map(function (r) {
          return r
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
    a.download = "物联监控数据.csv";
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }
  function bind() {
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
      if (n.dataset.close !== undefined) {
        el("detailModal").classList.add("is-hidden");
        return;
      }
      if (n.dataset.search === "query") {
        query();
        return;
      }
      if (n.dataset.reset) {
        el(n.dataset.reset + "Panel")
          .querySelectorAll("input,select")
          .forEach(function (x) {
            x.value = "";
          });
        if (n.dataset.reset === "query") {
          el("queryItem").value = "温度";
          query();
        } else {
          el("statItem").value = "温度";
          el("groupBy").value = "area";
          el("aggregate").value = "count";
          el("chartType").value = "bar";
          runStatistics();
        }
        return;
      }
      if (n.dataset.detail) {
        detail(n.dataset.detail);
        return;
      }
      if (n.dataset.page) {
        pageNo = Number(n.dataset.page);
        renderTable();
        return;
      }
      if (n.dataset.dir) {
        var pages = Math.ceil(filtered.length / PAGE);
        pageNo = Math.max(1, Math.min(pages, pageNo + Number(n.dataset.dir)));
        renderTable();
      }
    };
    el("runStatistics").onclick = runStatistics;
    el("exportQuery").onclick = csv;
    global.addEventListener("resize", function () {
      Object.keys(charts).forEach(function (k) {
        charts[k].resize();
      });
    });
  }
  function init() {
    if (!global.echarts) {
      toast("图表组件未加载");
      return;
    }
    bind();
    Promise.all([S.loadDevices(), S.loadRows()])
      .then(function (v) {
        data.devices = v[0];
        data.rows = v[1];
        options();
        query();
        runStatistics();
      })
      .catch(function (e) {
        toast(e.message || "监控数据加载失败");
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
