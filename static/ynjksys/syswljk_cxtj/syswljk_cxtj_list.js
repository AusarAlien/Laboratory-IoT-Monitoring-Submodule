(function (global) {
  "use strict";
  var S = global.SyswljkQueryService,
    devices = [],
    rows = [],
    statRows = [],
    statSource = [],
    statColumns = [],
    statMeasures = [],
    statCellRows = {},
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
  function multiOptions(id) {
    return Array.prototype.slice.call(el(id).querySelectorAll("[data-multi-option]"));
  }
  function multiValues(id) {
    var options = multiOptions(id), checked;
    if (!options.length) return null;
    checked = options.filter(function (n) { return n.checked; });
    return checked.length === options.length ? null : checked.map(function (n) { return n.value; });
  }
  function updateMultiText(id) {
    var root = el(id), options = multiOptions(id), checked = options.filter(function (n) { return n.checked; }), text = root.querySelector("[data-multi-text]"), all = root.querySelector("[data-multi-all]");
    if (all) all.checked = options.length > 0 && checked.length === options.length;
    if (!checked.length) text.textContent = "请选择";
    else if (checked.length === options.length) text.textContent = root.dataset.allLabel;
    else if (checked.length <= 2) text.textContent = checked.map(function (n) { return n.dataset.label; }).join("、");
    else text.textContent = "已选 " + checked.length + " 项";
    text.title = checked.map(function (n) { return n.dataset.label; }).join("、");
  }
  function setMultiOptions(id, items) {
    var root = el(id), old = multiOptions(id), oldChecked = {}, wasAll = !old.length || old.every(function (n) { return n.checked; }), hasMatchedSelection;
    old.forEach(function (n) { if (n.checked) oldChecked[n.value] = true; });
    hasMatchedSelection = items.some(function (item) { return oldChecked[String(item[0])]; });
    if (!hasMatchedSelection) wasAll = true;
    root.innerHTML = '<button type="button" class="multi-select-trigger" data-multi-toggle="' + id + '"><span data-multi-text></span><i></i></button><div class="multi-select-panel"><label class="multi-select-option all"><input type="checkbox" data-multi-all="' + id + '"><span>' + esc(root.dataset.allLabel) + '</span></label><div>' + items.map(function (item) { var value = String(item[0]), label = String(item[1]); return '<label class="multi-select-option"><input type="checkbox" data-multi-option="' + id + '" value="' + esc(value) + '" data-label="' + esc(label) + '"' + (wasAll || oldChecked[value] ? " checked" : "") + '><span>' + esc(label) + "</span></label>"; }).join("") + "</div></div>";
    updateMultiText(id);
  }
  function closeMulti(except) {
    document.querySelectorAll(".multi-select.is-open").forEach(function (n) { if (n !== except) n.classList.remove("is-open"); });
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
    var statDevice = stat ? multiValues("statDevice") : null, statArea = stat ? multiValues("statArea") : null, statItem = stat ? multiValues("statItem") : null, statStatus = stat ? multiValues("statStatus") : null;
    return {
      startTime: dt(val(prefix + "Start"), false),
      endTime: dt(val(prefix + "End"), true),
      type: val(prefix + "Type"),
      device: stat ? (statDevice && statDevice.length === 1 ? statDevice[0] : null) : val("queryDevice"),
      dept: stat ? (statArea && statArea.length === 1 ? statArea[0] : null) : val("queryArea"),
      metric: stat ? (statItem && statItem.length === 1 ? statItem[0] : null) : val("queryItem") || null,
      status: stat ? (statStatus && statStatus.length === 1 ? statStatus[0] : null) : val("queryStatus"),
      page: page,
      pageSize: PAGE,
    };
  }
  function setMetricOptions(prefix) {
    var type = val(prefix + "Type"),
      list = METRICS[type] || [],
      select,
      old;
    if (prefix === "stat") { setMultiOptions("statItem", list.map(function (x) { return [x[0], x[1]]; })); return; }
    select = el(prefix + "Item"); old = select.value;
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
  function setStatisticsOptions() {
    var type = val("statType"), list = devices.filter(function (d) { return d.type === type; }), depts = [];
    list.forEach(function (d) { if (depts.indexOf(d.dept) < 0) depts.push(d.dept); });
    setMultiOptions("statDevice", list.map(function (d) { return [d.id, d.name]; }));
    setMultiOptions("statArea", depts.sort().map(function (d) { return [d, d]; }));
  }
  function options() {
    setMetricOptions("query");
    setMetricOptions("stat");
    setDeviceOptions();
    setStatisticsOptions();
    setMultiOptions("statStatus", [["正常", "正常"], ["超限", "超限"], ["无效", "无效"]]);
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
          esc(r.deviceCode || r.deviceIp) +
          "</td><td>" +
          esc(r.deviceName) +
          "</td><td>" +
          esc(r.socket || r.deviceIp || "--") +
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
  function currentPageRows(result) {
    var list = Array.isArray(result) ? result : [],
      start = (page - 1) * PAGE + 1,
      end = page * PAGE,
      numbered = list.filter(function (r) {
        var rowNo = Number(r.rowNo);
        return Number.isFinite(rowNo) && rowNo >= start && rowNo <= end;
      });
    /*
     * Registered SQL normally returns the requested page. Some deployed query
     * definitions can still return the complete result set. Prefer the global
     * row number when present, then cap the rendered page as a safe fallback.
     */
    return (numbered.length ? numbered : list).slice(0, PAGE);
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
      var groupKey = r.deviceId + "|" + (r.socket || r.deviceIp || ""),
        seriesName = r.deviceName + (r.socket ? "（" + r.socket + "）" : "");
      (groups[groupKey] = groups[groupKey] || {
        name: seriesName,
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
        var resultRows = Array.isArray(v[0]) ? v[0] : [];
        total = resultRows.length ? resultRows[0].total : v[1].total;
        rows = currentPageRows(resultRows);
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
  var DIMENSION_NAMES = { area: "所属科室", type: "设备类型", device: "设备名称", item: "监测指标", status: "数据状态", day: "监测日期", hour: "监测小时", socket: "采集端" };
  var MEASURE_NAMES = { count: "数据量", avg: "平均值", max: "最大值", min: "最小值", delta: "极差", alarmCount: "超限数", alarmRate: "超限率" };
  function groupLabel(r, k) {
    var value = k === "area" ? r.dept : k === "type" ? r.deviceType : k === "device" ? r.deviceName : k === "item" ? r.metricName : k === "status" ? r.status : k === "socket" ? (r.socket || r.deviceIp) : k === "hour" ? r.time.slice(0, 13) + ":00" : r.time.slice(0, 10);
    return value || "未设置";
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
    if (m === "alarmCount") return a.filter(function (r) { return r.status === "超限"; }).length;
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
    return m === "max" ? Math.max.apply(null, nums) : Math.min.apply(null, nums);
  }
  function selectedMeasures() { return Array.prototype.filter.call(document.querySelectorAll('input[name="statMeasure"]'), function (n) { return n.checked; }).map(function (n) { return n.value; }); }
  function cellKey(row, column) { return row + "\u001f" + column; }
  function formatMeasure(value, measure) { if (value == null || Number.isNaN(value)) return "--"; return value + (measure === "alarmRate" ? "%" : ""); }
  function runStatistics() {
    var p = params("stat");
    var rowDimension = val("rowDimension"), columnDimension = val("columnDimension"), measures = selectedMeasures(), chartMeasure = val("chartMeasure");
    var members = { metric: multiValues("statItem"), device: multiValues("statDevice"), dept: multiValues("statArea"), status: multiValues("statStatus") };
    if (Object.keys(members).some(function (key) { return Array.isArray(members[key]) && !members[key].length; })) { toast("每类统计成员请至少勾选一项"); return; }
    if (!measures.length) { toast("请至少选择一个度量指标"); return; }
    if (columnDimension && columnDimension === rowDimension) { toast("行维度和列维度不能相同"); return; }
    if (!members.metric && rowDimension !== "item" && columnDimension !== "item" && measures.concat([chartMeasure]).some(function (m) { return ["avg", "max", "min", "delta"].indexOf(m) >= 0; })) { toast("统计全部指标的数值时，请将监测指标设为行维度或列维度"); return; }
    p.page = 1;
    p.pageSize = 20000;
    S.loadRows(p)
      .then(function (all) {
        var rowGroups = {}, columnSeen = {}, topN = Number(val("topN")), sortOrder = val("sortOrder");
        statSource = (Array.isArray(all) ? all : []).filter(function (r) {
          return (!members.metric || members.metric.indexOf(String(r.metricCode)) >= 0) && (!members.device || members.device.indexOf(String(r.deviceId || r.deviceIp)) >= 0) && (!members.dept || members.dept.indexOf(String(r.dept)) >= 0) && (!members.status || members.status.indexOf(String(r.status)) >= 0);
        }); statMeasures = measures; statCellRows = {};
        statSource.forEach(function (r) {
          var row = groupLabel(r, rowDimension), column = columnDimension ? groupLabel(r, columnDimension) : "全部";
          (rowGroups[row] = rowGroups[row] || []).push(r); columnSeen[column] = true;
          (statCellRows[cellKey(row, column)] = statCellRows[cellKey(row, column)] || []).push(r);
        });
        statColumns = Object.keys(columnSeen).sort();
        statRows = Object.keys(rowGroups).map(function (row) {
          var item = { group: row, source: rowGroups[row], cells: {}, sortValue: aggregate(rowGroups[row], chartMeasure) };
          statColumns.forEach(function (column) { var source = statCellRows[cellKey(row, column)] || []; item.cells[column] = {}; measures.forEach(function (measure) { item.cells[column][measure] = aggregate(source, measure); }); });
          return item;
        });
        statRows.sort(function (a, b) { if (sortOrder === "labelAsc") return a.group.localeCompare(b.group, "zh-CN"); var av = a.sortValue == null ? -Infinity : a.sortValue, bv = b.sortValue == null ? -Infinity : b.sortValue; return sortOrder === "valueAsc" ? av - bv : bv - av; });
        if (topN > 0) statRows = statRows.slice(0, topN);
        renderStatistics(rowDimension, columnDimension, chartMeasure);
      })
      .catch(function () {
        toast("统计数据加载失败，请稍后重试");
      });
  }
  function renderStatistics(rowDimension, columnDimension, chartMeasure) {
    var header = '<tr><th rowspan="' + (columnDimension ? 2 : 1) + '">序号</th><th rowspan="' + (columnDimension ? 2 : 1) + '">' + DIMENSION_NAMES[rowDimension] + "</th>";
    statColumns.forEach(function (column) { if (columnDimension) header += '<th colspan="' + statMeasures.length + '">' + esc(column) + "</th>"; else statMeasures.forEach(function (measure) { header += "<th>" + MEASURE_NAMES[measure] + "</th>"; }); });
    header += "</tr>";
    if (columnDimension) { header += "<tr>"; statColumns.forEach(function () { statMeasures.forEach(function (measure) { header += "<th>" + MEASURE_NAMES[measure] + "</th>"; }); }); header += "</tr>"; }
    el("statisticsHead").innerHTML = header;
    el("statisticsTitle").textContent = DIMENSION_NAMES[rowDimension] + (columnDimension ? " × " + DIMENSION_NAMES[columnDimension] : "") + " · " + MEASURE_NAMES[chartMeasure];
    el("statisticsRows").innerHTML = statRows.map(function (row, index) {
      var html = "<tr><td>" + (index + 1) + "</td><td>" + esc(row.group) + "</td>";
      statColumns.forEach(function (column) { statMeasures.forEach(function (measure) { var value = row.cells[column][measure]; html += '<td><button class="pivot-cell" data-stat-cell="' + encodeURIComponent(cellKey(row.group, column)) + '" data-stat-measure="' + measure + '">' + formatMeasure(value, measure) + "</button></td>"; }); });
      return html + "</tr>";
    }).join("");
    el("statisticsSummary").textContent = "（" + statRows.length + " 个行成员，" + statColumns.length + " 个列成员）";
    el("analysisRows").textContent = statSource.length + " 条";
    el("analysisRowGroups").textContent = statRows.length + " 个";
    el("analysisColumnGroups").textContent = statColumns.length + " 个";
    el("analysisMeasures").textContent = statMeasures.length + " 项";
    el("statisticsEmpty").classList.toggle("is-hidden", statRows.length > 0);
    el("customEmpty").classList.toggle("is-hidden", statRows.length > 0);
    var type = val("chartType"), c = chart("customChart"), series;
    if (type === "pie") {
      series = [{ type: "pie", radius: "62%", data: statRows.map(function (row) { return { name: row.group, value: aggregate(row.source, chartMeasure) }; }), label: { formatter: "{b}: {c}" } }];
    } else {
      series = statColumns.map(function (column) { return { name: columnDimension ? column : MEASURE_NAMES[chartMeasure], type: type, smooth: false, data: statRows.map(function (row) { return aggregate(statCellRows[cellKey(row.group, column)] || [], chartMeasure); }) }; });
    }
    c.clear();
    c.setOption({
      tooltip: { trigger: type === "pie" ? "item" : "axis" },
      legend: { top: 8, type: "scroll" },
      grid: { left: 78, right: 25, top: 48, bottom: 85 },
      xAxis:
        type === "pie"
          ? undefined
          : {
              type: "category",
              data: statRows.map(function (x) { return x.group; }), axisLabel: { rotate: 25, interval: 0 },
            },
      yAxis: type === "pie" ? undefined : { type: "value", name: MEASURE_NAMES[chartMeasure] + (chartMeasure === "alarmRate" ? "（%）" : "") },
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
        ["设备编号", r.deviceCode || r.deviceIp],
        ["设备名称", r.deviceName],
        ["规格型号", r.deviceModel || "--"],
        ["采集端", r.socket || r.deviceIp || "--"],
        ["设备类型", r.deviceType],
        ["所属科室", r.dept],
        ["存放位置", r.location || "--"],
        ["监测指标", r.metricName],
        [
          "监测值",
          (r.value == null ? "--" : r.value) + (r.unit ? " " + r.unit : ""),
        ],
        ["标准范围", range],
        ["数据状态", r.status],
        ["异常说明", r.alarm || "--"],
      ];
    el("detailModalTitle").textContent = "监控数据详情";
    el("detailModalCard").classList.remove("wide");
    el("detailBody").className = "detail-body";
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
  function drill(cell, measure) {
    var list = statCellRows[decodeURIComponent(cell)] || [];
    el("detailModalTitle").textContent = "统计钻取明细 · " + MEASURE_NAMES[measure];
    el("detailModalCard").classList.add("wide");
    el("detailBody").className = "modal-body";
    el("detailBody").innerHTML = '<div class="hint">共 ' + list.length + ' 条，当前展示前100条</div><div class="table-scroll"><table class="drill-table"><thead><tr><th>监测时间</th><th>设备名称</th><th>采集端</th><th>所属科室</th><th>监测指标</th><th>监测值</th><th>状态</th></tr></thead><tbody>' + list.slice(0, 100).map(function (r) { return "<tr><td>" + esc(r.time) + "</td><td>" + esc(r.deviceName) + "</td><td>" + esc(r.socket || r.deviceIp || "--") + "</td><td>" + esc(r.dept) + "</td><td>" + esc(r.metricName) + "</td><td>" + esc(r.value == null ? "--" : r.value + (r.unit ? " " + r.unit : "")) + "</td><td>" + esc(r.status) + "</td></tr>"; }).join("") + "</tbody></table></div>";
    el("detailModal").classList.remove("is-hidden");
  }
  function exportStatistics() {
    if (!statRows.length) { toast("当前没有可导出的统计结果"); return; }
    var header = ["序号", DIMENSION_NAMES[val("rowDimension")]], columns = [];
    statColumns.forEach(function (column) { statMeasures.forEach(function (measure) { var name = (val("columnDimension") ? column + " / " : "") + MEASURE_NAMES[measure]; columns.push([column, measure]); header.push(name); }); });
    var matrix = [header].concat(statRows.map(function (row, index) { return [index + 1, row.group].concat(columns.map(function (column) { return formatMeasure(row.cells[column[0]][column[1]], column[1]); })); }));
    var content = matrix.map(function (line) { return line.map(function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n"), link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" })); link.download = "物联多维统计.csv"; link.click(); setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
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
          "采集端",
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
              r.deviceCode || r.deviceIp,
              r.deviceName,
              r.socket || r.deviceIp,
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
    var toggle = e.target.closest ? e.target.closest("[data-multi-toggle]") : null, root;
    if (toggle) { root = el(toggle.dataset.multiToggle); closeMulti(root); root.classList.toggle("is-open"); return; }
    if (!(e.target.closest && e.target.closest(".multi-select"))) closeMulti();
    var n = e.target.closest ? (e.target.closest("[data-close],[data-search],[data-detail],[data-stat-cell],[data-page],[data-dir],[data-reset]") || e.target) : e.target;
    if (n.dataset.close !== undefined)
      el("detailModal").classList.add("is-hidden");
    else if (n.dataset.search === "query") {
      page = 1;
      query();
    } else if (n.dataset.detail) detail(n.dataset.detail);
    else if (n.dataset.statCell) drill(n.dataset.statCell, n.dataset.statMeasure);
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
        setStatisticsOptions();
        setMultiOptions("statStatus", [["正常", "正常"], ["超限", "超限"], ["无效", "无效"]]);
        el("rowDimension").value = "device";
        el("columnDimension").value = "item";
        document.querySelectorAll('input[name="statMeasure"]').forEach(function (x) { x.checked = x.value === "count" || x.value === "avg"; });
        el("chartMeasure").value = "count";
        el("chartType").value = "bar";
        el("sortOrder").value = "valueDesc";
        el("topN").value = "20";
        runStatistics();
      }
    }
  };
  document.body.onchange = function (e) {
    var id = e.target.dataset.multiAll || e.target.dataset.multiOption;
    if (!id) return;
    if (e.target.dataset.multiAll) multiOptions(id).forEach(function (n) { n.checked = e.target.checked; });
    updateMultiText(id);
  };
  el("queryType").onchange = function () {
    setMetricOptions("query");
    setDeviceOptions();
    page = 1;
    query();
  };
  el("statType").onchange = function () {
    setMetricOptions("stat");
    setStatisticsOptions();
    runStatistics();
  };
  el("runStatistics").onclick = runStatistics;
  el("exportQuery").onclick = csv;
  el("exportStatistics").onclick = exportStatistics;
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
