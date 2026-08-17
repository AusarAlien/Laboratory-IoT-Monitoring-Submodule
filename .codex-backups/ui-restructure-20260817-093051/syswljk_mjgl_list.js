(function (global) {
  "use strict";
  var S = global.MjglService,
    state = {
      tab: "latest",
      records: [],
      devices: [],
      people: [],
      areas: [],
      total: 0,
      page: 1,
      pageSize: 20,
      loading: false,
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
  function value(row, name) {
    if (!row) return "";
    if (row[name] !== undefined) return row[name];
    var key = Object.keys(row).find(function (k) {
      return k.toUpperCase() === name.toUpperCase();
    });
    return key ? row[key] : "";
  }
  function num(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  function showError(error) {
    var m =
      error && error.message ? error.message : String(error || "查询失败");
    el("toast").textContent = m;
    el("toast").classList.remove("hidden");
    clearTimeout(showError.t);
    showError.t = setTimeout(function () {
      el("toast").classList.add("hidden");
    }, 3200);
  }
  function formatDateTime(v) {
    if (!v) return null;
    return String(v).replace("T", " ") + (String(v).length === 16 ? ":00" : "");
  }
  var columns = {
    latest: [
      ["操作", "action"],
      ["序号", "FROWSEQ"],
      ["发生时间", "FCHECKTIME"],
      ["人员编号", "FBADGENUMBER"],
      ["人员姓名", "FNAME"],
      ["所属区域", "FAREA"],
      ["门禁设备SN", "FSN"],
      ["门点", "FSENSORID"],
      ["出入方向", "FCHECKTYPE"],
      ["验证方式", "FCODETYPE"],
    ],
    records: [
      ["操作", "action"],
      ["序号", "FROWSEQ"],
      ["发生时间", "FCHECKTIME"],
      ["人员编号", "FBADGENUMBER"],
      ["人员姓名", "FNAME"],
      ["卡号", "FCARDNO"],
      ["实验室", "FLABNAME"],
      ["所属区域", "FAREA"],
      ["门禁设备SN", "FSN"],
      ["门点", "FSENSORID"],
      ["出入方向", "FCHECKTYPE"],
      ["验证方式", "FCODETYPE"],
      ["口罩标记", "FMASKFLAG"],
      ["体温", "FTEMPERATURE"],
      ["设备备注", "FMEMOINFO"],
    ],
    devices: [
      ["操作", "action"],
      ["序号", "seq"],
      ["设备序列号", "FSN"],
      ["实验室", "FLABNAME"],
      ["所属区域", "FAREA"],
      ["区域别名", "FAREAALIAS"],
      ["门点数量", "FSENSORCOUNT"],
      ["累计记录", "FRECORDCOUNT"],
      ["最近记录时间", "FLASTCHECKTIME"],
    ],
    people: [
      ["操作", "action"],
      ["序号", "seq"],
      ["用户ID", "FUSERID"],
      ["人员编号", "FBADGENUMBER"],
      ["姓名", "FNAME"],
      ["卡号", "FCARDNO"],
      ["默认部门ID", "FDEFAULTDEPTID"],
      ["验证方法代码", "FVERIFICATIONMETHOD"],
      ["权限级别", "FPRIVILEGE"],
      ["有效状态", "FEXPIRESTATUS"],
      ["有效期开始", "FVALIDTIMEBEGIN"],
      ["有效期结束", "FVALIDTIMEEND"],
      ["照片状态", "FPHOTOSTATUS"],
    ],
  };
  function filters() {
    return {
      keyword: el("keyword").value.trim(),
      area: el("area").value,
      sn: el("device").value,
      direction: el("direction").value,
      verifyCode: el("verify").value,
      startTime: formatDateTime(el("startTime").value),
      endTime: formatDateTime(el("endTime").value),
      page: state.page,
      pageSize: state.pageSize,
    };
  }
  function validate(f) {
    if (f.startTime && f.endTime && f.startTime > f.endTime)
      return "开始时间不能晚于结束时间";
    return "";
  }
  function setLoading(on) {
    state.loading = on;
    el("search").disabled = on;
    el("reset").disabled = on;
    if (on) {
      el("tbody").innerHTML =
        '<tr><td class="loading" colspan="15">正在加载...</td></tr>';
      el("pagination").innerHTML = "";
    }
  }
  function recordKey(r) {
    return [
      value(r, "FUSERID"),
      value(r, "FSN"),
      value(r, "FSENSORID"),
      value(r, "FCHECKTIME"),
    ].join("|");
  }
  function renderTable() {
    var list = state[state.tab] || [],
      cols = columns[state.tab],
      keyword = el("optionKeyword").value.trim().toLowerCase();
    if (state.tab === "devices" || state.tab === "people")
      list = list.filter(function (r) {
        return (
          !keyword ||
          Object.keys(r).some(function (k) {
            return (
              String(r[k] || "")
                .toLowerCase()
                .indexOf(keyword) >= 0
            );
          })
        );
      });
    el("thead").innerHTML =
      "<tr>" +
      cols
        .map(function (c) {
          return "<th>" + c[0] + "</th>";
        })
        .join("") +
      "</tr>";
    el("tbody").innerHTML =
      list
        .map(function (r, i) {
          var sourceIndex = (state[state.tab] || []).indexOf(r);
          return (
            "<tr>" +
            cols
              .map(function (c) {
                if (c[1] === "action")
                  return (
                    '<td><button class="action" data-view="' +
                    esc(recordKey(r) || String(i)) +
                    '" data-index="' +
                    sourceIndex +
                    '">查看</button></td>'
                  );
                if (c[1] === "seq") return "<td>" + (i + 1) + "</td>";
                var v = value(r, c[1]);
                if (c[1] === "FTEMPERATURE" && v !== "" && v != null)
                  v = String(v) + " ℃";
                return (
                  '<td title="' +
                  esc(v || "--") +
                  '">' +
                  esc(v || "--") +
                  "</td>"
                );
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") ||
      '<tr><td class="empty" colspan="' +
        cols.length +
        '">暂无符合条件的数据</td></tr>';
    el("summary").textContent =
      "（当前显示 " +
      list.length +
      (state.tab === "latest" || state.tab === "records"
        ? " 条，共 " + state.total + " 条"
        : " 条") +
      "）";
    renderPager();
  }
  function renderPager() {
    if (state.tab !== "latest" && state.tab !== "records") {
      el("pagination").innerHTML = "";
      return;
    }
    var pages = Math.max(1, Math.ceil(state.total / state.pageSize)),
      start = Math.max(1, state.page - 2),
      end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    var h =
      '<button data-page="' +
      (state.page - 1) +
      '" ' +
      (state.page <= 1 ? "disabled" : "") +
      ">‹</button>";
    for (var i = start; i <= end; i++)
      h +=
        '<button data-page="' +
        i +
        '" class="' +
        (i === state.page ? "current" : "") +
        '">' +
        i +
        "</button>";
    h +=
      '<button data-page="' +
      (state.page + 1) +
      '" ' +
      (state.page >= pages ? "disabled" : "") +
      ">›</button><span>共 " +
      pages +
      " 页，" +
      state.total +
      " 条</span>";
    el("pagination").innerHTML = h;
  }
  function renderMetrics(summary) {
    var r = summary[0] || {};
    el("mControllers").textContent = state.devices.length;
    el("mRecords").textContent = num(value(r, "FRECORDCOUNT"));
    el("mEntry").textContent = num(value(r, "FENTRYCOUNT"));
    el("mExit").textContent = num(value(r, "FEXITCOUNT"));
    el("mFace").textContent = num(value(r, "FFACECOUNT"));
  }
  function loadRecordData() {
    var f = filters(),
      msg = validate(f);
    if (msg) {
      showError(msg);
      return Promise.resolve();
    }
    setLoading(true);
    return Promise.all([S.loadRecords(f), S.loadSummary(f)])
      .then(function (result) {
        state.records = result[0];
        state.latest = result[0];
        state.total = state.records.length
          ? num(value(state.records[0], "FTOTALCOUNT"))
          : 0;
        renderMetrics(result[1]);
        renderTable();
      })
      .catch(function (e) {
        console.error("门禁记录加载失败：", e);
        state.records = [];
        state.latest = [];
        state.total = 0;
        el("tbody").innerHTML =
          '<tr><td class="load-error" colspan="15">数据加载失败，请稍后重试</td></tr>';
        el("summary").textContent = "（加载失败）";
        el("pagination").innerHTML = "";
        showError("数据加载失败，请稍后重试");
      })
      .finally(function () {
        setLoading(false);
      });
  }
  function loadCurrent() {
    if (state.tab === "latest" || state.tab === "records")
      return loadRecordData();
    renderTable();
    return Promise.resolve();
  }
  function switchTab(tab) {
    state.tab = tab;
    state.page = 1;
    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === tab);
    });
    var record = tab === "latest" || tab === "records";
    document.querySelectorAll('[data-for="record"]').forEach(function (x) {
      x.classList.toggle("hidden", !record);
    });
    document.querySelectorAll('[data-for="option"]').forEach(function (x) {
      x.classList.toggle("hidden", record);
    });
    el("listTitle").textContent = {
      latest: "最新门禁记录",
      devices: "门禁设备列表",
      people: "门禁人员列表",
      records: "门禁记录列表",
    }[tab];
    el("headActions").innerHTML =
      tab === "records"
        ? '<button class="button" data-export>导出当前结果</button>'
        : tab === "latest"
          ? '<button class="button" data-refresh>刷新</button>'
          : "";
    loadCurrent();
  }
  function fillOptions() {
    el("area").innerHTML =
      '<option value="">全部区域</option>' +
      state.areas
        .map(function (r) {
          var v = value(r, "FAREA"),
            alias = value(r, "FAREAALIAS");
          return (
            '<option value="' +
            esc(v) +
            '">' +
            esc(v + (alias && alias !== v ? "（" + alias + "）" : "")) +
            "</option>"
          );
        })
        .join("");
    el("device").innerHTML =
      '<option value="">全部设备</option>' +
      state.devices
        .map(function (r) {
          var sn = value(r, "FSN"),
            name = value(r, "FLABNAME") || value(r, "FAREA") || sn;
          return (
            '<option value="' +
            esc(sn) +
            '">' +
            esc(name + "｜" + sn) +
            "</option>"
          );
        })
        .join("");
  }
  function detail(index) {
    var r = (state[state.tab] || [])[Number(index)];
    if (!r) return;
    el("modalTitle").textContent =
      "查看" +
      {
        latest: "最新门禁记录",
        records: "门禁记录",
        devices: "门禁设备",
        people: "门禁人员",
      }[state.tab];
    el("modalBody").innerHTML =
      '<div class="detail-grid">' +
      columns[state.tab]
        .filter(function (c) {
          return c[1] !== "action" && c[1] !== "seq";
        })
        .map(function (c) {
          return (
            '<div class="detail"><span>' +
            c[0] +
            "</span><strong>" +
            esc(value(r, c[1]) || "--") +
            "</strong></div>"
          );
        })
        .join("") +
      "</div>";
    el("modal").classList.remove("hidden");
  }
  function exportCsv() {
    var cols = columns.records.filter(function (c) {
        return c[1] !== "action";
      }),
      csv =
        cols
          .map(function (c) {
            return c[0];
          })
          .join(",") +
        "\n" +
        state.records
          .map(function (r) {
            return cols
              .map(function (c) {
                return (
                  '"' + String(value(r, c[1]) || "").replace(/"/g, '""') + '"'
                );
              })
              .join(",");
          })
          .join("\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv" }),
    );
    a.download = "门禁记录.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function defaults() {
    el("startTime").value = "";
    el("endTime").value = "";
  }
  document.body.addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset.tab) switchTab(t.dataset.tab);
    if (t.dataset.close !== undefined) el("modal").classList.add("hidden");
    if (t.dataset.index !== undefined) detail(t.dataset.index);
    if (t.dataset.page) {
      state.page = Number(t.dataset.page);
      loadRecordData();
    }
    if (t.dataset.refresh !== undefined) loadRecordData();
    if (t.dataset.export !== undefined) exportCsv();
  });
  el("search").onclick = function () {
    state.page = 1;
    if (state.tab === "people")
      S.loadPeople(el("optionKeyword").value.trim())
        .then(function (r) {
          state.people = r;
          renderTable();
        })
        .catch(showError);
    else loadCurrent();
  };
  el("reset").onclick = function () {
    el("keyword").value = "";
    el("area").value = "";
    el("device").value = "";
    el("direction").value = "";
    el("verify").value = "";
    el("optionKeyword").value = "";
    defaults();
    state.page = 1;
    loadCurrent();
  };
  el("optionKeyword").oninput = renderTable;
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    defaults();
    setLoading(true);
    Promise.all([S.loadAreas(), S.loadDevices(), S.loadPeople("")])
      .then(function (r) {
        state.areas = r[0];
        state.devices = r[1];
        state.people = r[2];
        fillOptions();
        return loadRecordData();
      })
      .catch(function (e) {
        console.error("门禁页面初始化失败：", e);
        setLoading(false);
        el("tbody").innerHTML =
          '<tr><td class="load-error" colspan="15">数据加载失败，请稍后重试</td></tr>';
        showError("数据加载失败，请稍后重试");
      });
  }
  global.addEventListener("load", init);
})(window);
