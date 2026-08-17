(function (global) {
  "use strict";
  var S = global.SyswljkStatusService,
    PAGE = 10,
    data = { devices: [], history: [], mappings: [] },
    state = {
      page: { realtime: 1, history: 1, mapping: 1 },
      filtered: { realtime: [], history: [], mapping: [] },
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
  function statusTag(s) {
    var c =
      {
        正常: "normal",
        离线: "offline",
        关机: "shutdown",
        异常: "abnormal",
        未知: "unknown",
      }[s] || "unknown";
    return '<span class="tag tag-' + c + '">' + esc(s) + "</span>";
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
  function unique(k) {
    var a = [];
    data.devices.forEach(function (x) {
      if (a.indexOf(x[k]) < 0) a.push(x[k]);
    });
    return a;
  }
  function options() {
    el("realtimeType").innerHTML =
      '<option value="">全部类型</option>' +
      unique("type")
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("mappingType").innerHTML =
      '<option value="">全部类型</option>' +
      unique("type")
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("realtimeArea").innerHTML =
      '<option value="">全部区域</option>' +
      unique("area")
        .map(function (x) {
          return "<option>" + esc(x) + "</option>";
        })
        .join("");
    el("historyDevice").innerHTML =
      '<option value="">全部设备</option>' +
      data.devices
        .map(function (x) {
          return '<option value="' + x.id + '">' + esc(x.name) + "</option>";
        })
        .join("");
  }
  function metrics() {
    ["正常", "离线", "关机", "异常", "未知"].forEach(function (s) {
      el(
        "metric" +
          {
            正常: "Normal",
            离线: "Offline",
            关机: "Shutdown",
            异常: "Abnormal",
            未知: "Unknown",
          }[s],
      ).textContent = data.devices.filter(function (x) {
        return x.status === s;
      }).length;
    });
    el("metricTotal").textContent = data.devices.length;
    el("dataTime").textContent = S.getReferenceTime();
  }
  function filter(name) {
    if (name === "realtime") {
      var k = val("realtimeKeyword").toLowerCase(),
        t = val("realtimeType"),
        a = val("realtimeArea"),
        s = val("realtimeStatus");
      state.filtered.realtime = data.devices.filter(function (x) {
        return (
          (!k || (x.name + " " + x.code).toLowerCase().indexOf(k) >= 0) &&
          (!t || x.type === t) &&
          (!a || x.area === a) &&
          (!s || x.status === s)
        );
      });
    } else if (name === "history") {
      var d = val("historyDevice"),
        s2 = val("historyStatus"),
        a2 = val("historyStart"),
        b = val("historyEnd");
      state.filtered.history = data.history.filter(function (x) {
        var day = x.time.slice(0, 10);
        return (
          (!d || x.deviceId === d) &&
          (!s2 || x.after === s2) &&
          (!a2 || day >= a2) &&
          (!b || day <= b)
        );
      });
    } else {
      var mt = val("mappingType"),
        mk = val("mappingKeyword").toLowerCase(),
        ms = val("mappingStatus");
      state.filtered.mapping = data.mappings.filter(function (x) {
        return (
          (!mt || x.type === mt) &&
          (!mk ||
            (x.rawCode + " " + x.rawName).toLowerCase().indexOf(mk) >= 0) &&
          (!ms || x.status === ms)
        );
      });
    }
    state.page[name] = 1;
    render(name);
  }
  function page(name) {
    return state.filtered[name].slice(
      (state.page[name] - 1) * PAGE,
      state.page[name] * PAGE,
    );
  }
  function pager(name) {
    var total = state.filtered[name].length,
      pages = Math.ceil(total / PAGE),
      cur = state.page[name],
      h =
        '<button data-pager="' +
        name +
        '" data-dir="-1" ' +
        (cur <= 1 ? "disabled" : "") +
        ">‹</button>";
    for (var i = 1; i <= pages; i++)
      h +=
        '<button data-pager="' +
        name +
        '" data-page="' +
        i +
        '" class="' +
        (i === cur ? "is-current" : "") +
        '">' +
        i +
        "</button>";
    h +=
      '<button data-pager="' +
      name +
      '" data-dir="1" ' +
      (cur >= pages ? "disabled" : "") +
      ">›</button><span>共 " +
      pages +
      " 页，" +
      total +
      " 条</span>";
    el(name + "Pager").innerHTML = h;
  }
  function render(name) {
    if (name === "realtime") {
      el("realtimeRows").innerHTML = page(name)
        .map(function (x, i) {
          return (
            '<tr><td><button class="action" data-detail="realtime" data-id="' +
            x.id +
            '">查看</button></td><td>' +
            ((state.page.realtime - 1) * PAGE + i + 1) +
            "</td><td>" +
            esc(x.code) +
            "</td><td" +
            title(x.name) +
            ">" +
            esc(x.name) +
            "</td><td>" +
            esc(x.socket || "--") +
            "</td><td>" +
            esc(x.type) +
            "</td><td>" +
            esc(x.area) +
            "</td><td>" +
            statusTag(x.status) +
            "</td><td>" +
            esc(x.rawName) +
            "（" +
            esc(x.rawCode) +
            "）</td><td" +
            title(x.description) +
            ">" +
            esc(x.description) +
            "</td><td>" +
            esc(x.lastTime) +
            "</td><td>" +
            x.timeout +
            " 秒</td><td>" +
            esc(x.duration) +
            "</td></tr>"
          );
        })
        .join("");
    } else if (name === "history") {
      el("historyRows").innerHTML = page(name)
        .map(function (x, i) {
          var d = device(x.deviceId);
          return (
            '<tr><td><button class="action" data-detail="history" data-id="' +
            x.id +
            '">查看</button></td><td>' +
            ((state.page.history - 1) * PAGE + i + 1) +
            "</td><td>" +
            esc(x.time) +
            "</td><td>" +
            esc(d.code) +
            "</td><td>" +
            esc(d.name) +
            "</td><td>" +
            esc(d.socket || "--") +
            "</td><td>" +
            esc(d.type) +
            "</td><td>" +
            esc(d.area) +
            "</td><td>" +
            statusTag(x.before) +
            "</td><td>" +
            statusTag(x.after) +
            "</td><td>" +
            esc(x.raw) +
            "</td><td" +
            title(x.reason) +
            ">" +
            esc(x.reason) +
            "</td></tr>"
          );
        })
        .join("");
    } else {
      el("mappingRows").innerHTML = page(name)
        .map(function (x, i) {
          return (
            '<tr><td><button class="action" data-detail="mapping" data-id="' +
            x.id +
            '">查看</button></td><td>' +
            ((state.page.mapping - 1) * PAGE + i + 1) +
            "</td><td>" +
            esc(x.type) +
            "</td><td>" +
            esc(x.rawCode) +
            "</td><td>" +
            esc(x.rawName) +
            "</td><td>" +
            statusTag(x.status) +
            "</td><td>" +
            x.priority +
            "</td><td" +
            title(x.description) +
            ">" +
            esc(x.description) +
            "</td></tr>"
          );
        })
        .join("");
    }
    el(name + "Summary").textContent =
      "（当前查询 " + state.filtered[name].length + " 条）";
    el(name + "Empty").classList.toggle(
      "is-hidden",
      state.filtered[name].length > 0,
    );
    pager(name);
    metrics();
  }
  function all() {
    filter("realtime");
    filter("history");
    filter("mapping");
  }
  function show(kind, id) {
    var items, titleText;
    if (kind === "realtime") {
      var x = device(id);
      titleText = "设备实时状态详情";
      items = [
        ["设备编号", x.code],
        ["仪器主键", x.instrumentId],
        ["设备名称", x.name],
        ["规格型号", x.model],
        ["插座编号", x.socket],
        ["设备类型", x.type],
        ["所属区域", x.area],
        ["存放位置", x.location],
        ["统一状态", x.status],
        ["设备原始状态", x.rawName + "（" + x.rawCode + "）"],
        ["最后通信时间", x.lastTime],
        ["离线阈值", x.timeout + " 秒"],
        ["状态持续时间", x.duration],
        ["最新电流", x.current == null ? "--" : x.current + " A"],
        ["最新电压", x.voltage == null ? "--" : x.voltage + " V"],
        ["最新功率", x.power == null ? "--" : x.power + " kW"],
        ["累计能耗", x.energy == null ? "--" : x.energy + " kWh"],
        ["累计使用时长", x.useHours == null ? "--" : x.useHours + " h"],
        ["状态说明", x.description, "full"],
      ];
    } else if (kind === "history") {
      var h = data.history.find(function (x) {
          return x.id === id;
        }),
        d = device(h.deviceId);
      titleText = "状态变化详情";
      items = [
        ["设备编号", d.code],
        ["设备名称", d.name],
        ["插座编号", d.socket],
        ["变更时间", h.time],
        ["变更前状态", h.before],
        ["变更后状态", h.after],
        ["设备原始状态", h.raw],
        ["状态原因", h.reason, "full"],
      ];
    } else {
      var m = data.mappings.find(function (x) {
        return x.id === id;
      });
      titleText = "状态映射详情";
      items = [
        ["设备类型", m.type],
        ["原始状态码", m.rawCode],
        ["原始状态名称", m.rawName],
        ["统一状态", m.status],
        ["判定优先级", m.priority],
        ["状态说明", m.description, "full"],
      ];
    }
    el("modalTitle").textContent = titleText;
    el("modalBody").innerHTML =
      '<div class="detail-grid">' +
      items
        .map(function (v) {
          return (
            '<div class="detail-item ' +
            (v[2] || "") +
            '"><span>' +
            esc(v[0]) +
            "</span><strong>" +
            esc(v[1]) +
            "</strong></div>"
          );
        })
        .join("") +
      "</div>";
    el("modal").classList.remove("is-hidden");
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
    };
    document.body.onclick = function (e) {
      var n = e.target;
      if (n.dataset.close !== undefined) {
        el("modal").classList.add("is-hidden");
        return;
      }
      if (n.dataset.search) {
        filter(n.dataset.search);
        return;
      }
      if (n.dataset.reset) {
        el(n.dataset.reset + "Panel")
          .querySelectorAll("input,select")
          .forEach(function (x) {
            x.value = "";
          });
        filter(n.dataset.reset);
        return;
      }
      if (n.dataset.detail) {
        show(n.dataset.detail, n.dataset.id);
        return;
      }
      if (n.dataset.pager) {
        var name = n.dataset.pager,
          pages = Math.ceil(state.filtered[name].length / PAGE),
          p = Number(n.dataset.page),
          dir = Number(n.dataset.dir);
        state.page[name] =
          p || Math.max(1, Math.min(pages, state.page[name] + dir));
        render(name);
      }
    };
  }
  function init() {
    bind();
    Promise.all([S.loadRealtime(), S.loadHistory(), S.loadMappings()])
      .then(function (v) {
        data.devices = v[0];
        data.history = v[1];
        data.mappings = v[2];
        options();
        all();
      })
      .catch(function (e) {
        toast(e.message || "状态数据加载失败");
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
