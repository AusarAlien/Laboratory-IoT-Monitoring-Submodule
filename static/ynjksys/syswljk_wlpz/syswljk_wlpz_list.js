(function (global) {
  "use strict";
  var S = global.SyswljkConfigService,
    PAGE = 10,
    data = {
      types: [],
      devices: [],
      configDevices: [],
      areas: [],
      accounts: [],
    },
    state = {
      tab: "device",
      page: { device: 1, type: 1, account: 1 },
      filtered: { device: [], type: [], account: [] },
      areaId: "",
    },
    modalSave = null;
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
  function attr(v) {
    return esc(v || "--");
  }
  function find(rows, id) {
    return (
      rows.find(function (x) {
        return x.id === id;
      }) || {}
    );
  }
  function now() {
    var d = new Date(),
      p = function (n) {
        return String(n).padStart(2, "0");
      };
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes()) +
      ":" +
      p(d.getSeconds())
    );
  }
  function uid(prefix) {
    return prefix + "-" + Date.now().toString(36).toUpperCase();
  }
  function toast(msg) {
    var n = el("toast");
    n.textContent = msg;
    n.classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      n.classList.add("is-hidden");
    }, 2200);
  }
  function tag(v) {
    var c = /正常|启用|在用|已登记|待机/.test(v)
      ? "success"
      : /异常|锁定|停用|关机|报废/.test(v)
        ? "danger"
        : "muted";
    return '<span class="tag tag-' + c + '">' + esc(v || "--") + "</span>";
  }
  function yesTag(v) {
    return (
      '<span class="tag ' +
      (v ? "tag-warning" : "tag-muted") +
      '">' +
      (v ? "已启用" : "未启用") +
      "</span>"
    );
  }
  function configDevices() {
    return data.configDevices || [];
  }
  function typeName(id, x) {
    return (x && x.typeName) || find(data.types, id).name || "--";
  }
  function areaName(id) {
    return find(data.areas, id).name || "未分区";
  }
  function deviceArea(x) {
    return x.areaName || areaName(x.areaId);
  }
  function option(rows, value, text, placeholder) {
    return (
      '<option value="">' +
      placeholder +
      "</option>" +
      rows
        .map(function (x) {
          return (
            '<option value="' +
            esc(x[value]) +
            '">' +
            esc(x[text]) +
            "</option>"
          );
        })
        .join("")
    );
  }
  function uniqueOptions(rows, key, placeholder) {
    var values = [];
    rows.forEach(function (x) {
      var value = x[key];
      if (value && values.indexOf(value) < 0) values.push(value);
    });
    values.sort();
    return (
      '<option value="">' +
      placeholder +
      "</option>" +
      values
        .map(function (value) {
          return (
            '<option value="' + esc(value) + '">' + esc(value) + "</option>"
          );
        })
        .join("")
    );
  }
  function stats() {
    var areas = [];
    data.devices.forEach(function (x) {
      var a = deviceArea(x);
      if (a && a !== "未设置" && areas.indexOf(a) < 0) areas.push(a);
    });
    el("deviceCount").textContent = data.devices.length;
    el("connectedCount").textContent = data.devices.filter(function (x) {
      return x.connected;
    }).length;
    el("areaCount").textContent = areas.length;
  }
  function refreshOptions() {
    var t = el("deviceTypeFilter").value,
      a = el("deviceAreaFilter").value,
      s = el("deviceSourceFilter").value;
    el("deviceTypeFilter").innerHTML = uniqueOptions(
      data.devices,
      "typeName",
      "全部类型",
    );
    el("deviceAreaFilter").innerHTML = uniqueOptions(
      data.devices,
      "areaName",
      "全部区域",
    );
    el("deviceSourceFilter").innerHTML = uniqueOptions(
      data.devices,
      "source",
      "全部来源",
    );
    el("deviceTypeFilter").value = t;
    el("deviceAreaFilter").value = a;
    el("deviceSourceFilter").value = s;
  }
  function connection(x) {
    var p = x.params || {},
      bits = [];
    if (p.ip) bits.push(p.ip + (p.port ? ":" + p.port : ""));
    if (p.doorNo) bits.push("门编号 " + p.doorNo);
    return bits.join(" / ") || "--";
  }
  function filter(name) {
    if (name === "device") {
      var k = el("deviceKeyword").value.trim().toLowerCase(),
        t = el("deviceTypeFilter").value,
        a = el("deviceAreaFilter").value,
        s = el("deviceSourceFilter").value;
      state.filtered.device = data.devices.filter(function (x) {
        return (
          (!k ||
            (x.name + " " + x.code + " " + x.instId + " " + x.endpoint)
              .toLowerCase()
              .indexOf(k) >= 0) &&
          (!t || x.typeName === t) &&
          (!a || x.areaName === a) &&
          (!s || x.source === s)
        );
      });
    } else if (name === "type") {
      var tk = el("typeKeyword").value.trim().toLowerCase(),
        ts = el("typeStatusFilter").value;
      state.filtered.type = data.types.filter(function (x) {
        return (
          (!tk || (x.name + " " + x.code).toLowerCase().indexOf(tk) >= 0) &&
          (!ts || x.status === ts)
        );
      });
    } else {
      var ak = el("accountKeyword").value.trim().toLowerCase(),
        as = el("accountStatusFilter").value;
      state.filtered.account = data.accounts.filter(function (x) {
        return (
          (!ak || (x.username + " " + x.name).toLowerCase().indexOf(ak) >= 0) &&
          (!as || x.status === as)
        );
      });
    }
    state.page[name] = 1;
    render(name);
  }
  function pager(name) {
    var rows = state.filtered[name],
      pages = Math.ceil(rows.length / PAGE),
      cur = Math.min(state.page[name], pages || 1),
      items = [],
      html =
        '<button data-page-name="' +
        name +
        '" data-dir="-1" aria-label="上一页" ' +
        (cur <= 1 ? "disabled" : "") +
        ">‹</button>",
      i,
      start,
      end;
    if (pages <= 7) {
      for (i = 1; i <= pages; i++) items.push(i);
    } else {
      items.push(1);
      if (cur <= 4) {
        start = 2;
        end = 5;
      } else if (cur >= pages - 3) {
        start = pages - 4;
        end = pages - 1;
      } else {
        start = cur - 2;
        end = cur + 2;
      }
      if (start > 2) items.push("ellipsis");
      for (i = start; i <= end; i++) items.push(i);
      if (end < pages - 1) items.push("ellipsis");
      items.push(pages);
    }
    items.forEach(function (item) {
      if (item === "ellipsis")
        html += '<span class="pagination-ellipsis" aria-hidden="true">…</span>';
      else
        html +=
          '<button data-page-name="' +
          name +
          '" data-page="' +
          item +
          '" class="' +
          (item === cur ? "is-current" : "") +
          '" aria-label="第 ' +
          item +
          ' 页">' +
          item +
          "</button>";
    });
    html +=
      '<button data-page-name="' +
      name +
      '" data-dir="1" aria-label="下一页" ' +
      (cur >= pages ? "disabled" : "") +
      ">›</button><span>共 " +
      pages +
      " 页，" +
      rows.length +
      ' 条</span><label>跳至</label><input data-jump-name="' +
      name +
      '" type="number" min="1" max="' +
      pages +
      '"><span>页</span>';
    el(name + "Pager").innerHTML = html;
  }
  function pageRows(name) {
    return state.filtered[name].slice(
      (state.page[name] - 1) * PAGE,
      state.page[name] * PAGE,
    );
  }
  function actionButtons(kind, id, extra) {
    return (
      '<button class="action" data-act="edit" data-kind="' +
      kind +
      '" data-id="' +
      id +
      '">修改</button>' +
      extra +
      '<button class="action danger" data-act="delete" data-kind="' +
      kind +
      '" data-id="' +
      id +
      '">删除</button>'
    );
  }
  function render(name) {
    if (name === "device") renderDevices();
    if (name === "type") renderTypes();
    if (name === "account") renderAccounts();
    stats();
    refreshOptions();
    renderAreaTree();
    if (state.tab === "area") renderAreaDevices();
  }
  function renderDevices() {
    el("deviceRows").innerHTML = pageRows("device")
      .map(function (x, i) {
        return (
          '<tr><td><button class="action" data-act="view-device" data-id="' +
          esc(x.id) +
          '">查看</button><button class="action" data-act="configure-device" data-id="' +
          esc(x.id) +
          '">接入配置</button></td><td>' +
          ((state.page.device - 1) * PAGE + i + 1) +
          "</td><td>" +
          esc(x.code || "--") +
          '</td><td title="' +
          attr(x.name) +
          '">' +
          esc(x.name || "--") +
          "</td><td>" +
          esc(typeName(x.typeId, x)) +
          '</td><td title="' +
          attr(deviceArea(x)) +
          '">' +
          esc(deviceArea(x)) +
          '</td><td title="' +
          attr(x.endpoint) +
          '">' +
          esc(x.endpoint || "--") +
          '</td><td title="' +
          attr(x.connection) +
          '">' +
          esc(x.connection || "--") +
          "</td><td>" +
          tag(x.configStatus || "未配置") +
          "</td><td>" +
          (x.interval ? esc(x.interval) + " 秒" : "--") +
          "</td><td>" +
          (x.configured ? yesTag(x.warning) : tag("未配置")) +
          "</td><td>" +
          tag(x.archiveStatus || "未设置") +
          "</td><td>" +
          tag(x.runStatus || "--") +
          "</td><td>" +
          esc(x.source || "--") +
          "</td><td>" +
          esc(x.lastTime || "--") +
          "</td><td>" +
          esc(x.hiino || "--") +
          "</td></tr>"
        );
      })
      .join("");
    el("deviceSummary").textContent =
      "（当前查询 " + state.filtered.device.length + " 条）";
    el("deviceEmpty").classList.toggle(
      "is-hidden",
      state.filtered.device.length > 0,
    );
    pager("device");
  }
  function renderTypes() {
    el("typeRows").innerHTML = pageRows("type")
      .map(function (x, i) {
        var fields = (x.fields || [])
          .map(function (f) {
            return f.name;
          })
          .join("、");
        return (
          "<tr><td>" +
          actionButtons("type", x.id, "") +
          "</td><td>" +
          ((state.page.type - 1) * PAGE + i + 1) +
          "</td><td>" +
          esc(x.code) +
          "</td><td>" +
          esc(x.name) +
          '</td><td title="' +
          attr(fields) +
          '">' +
          esc(fields || "--") +
          "</td><td>" +
          configDevices().filter(function (d) {
            return d.typeId === x.id;
          }).length +
          "</td><td>" +
          tag(x.status) +
          '</td><td title="' +
          attr(x.description) +
          '">' +
          esc(x.description || "--") +
          "</td><td>" +
          esc(x.updateTime) +
          "</td></tr>"
        );
      })
      .join("");
    el("typeSummary").textContent =
      "（当前查询 " + state.filtered.type.length + " 条）";
    el("typeEmpty").classList.toggle(
      "is-hidden",
      state.filtered.type.length > 0,
    );
    pager("type");
  }
  function renderAccounts() {
    el("accountRows").innerHTML = pageRows("account")
      .map(function (x, i) {
        var areas = x.areaIds.map(areaName).join("、");
        return (
          "<tr><td>" +
          actionButtons(
            "account",
            x.id,
            '<button class="action" data-act="reset-password" data-kind="account" data-id="' +
              x.id +
              '">重置密码</button>',
          ) +
          "</td><td>" +
          ((state.page.account - 1) * PAGE + i + 1) +
          "</td><td>" +
          esc(x.username) +
          "</td><td>" +
          esc(x.name) +
          '</td><td title="' +
          attr(x.permissions.join("、")) +
          '">' +
          esc(x.permissions.join("、")) +
          '</td><td title="' +
          attr(areas) +
          '">' +
          esc(areas || "全部区域") +
          "</td><td>" +
          tag(x.status) +
          "</td><td>" +
          esc(x.lastLogin || "--") +
          "</td><td>" +
          esc(x.updateTime) +
          "</td></tr>"
        );
      })
      .join("");
    el("accountSummary").textContent =
      "（当前查询 " + state.filtered.account.length + " 条）";
    el("accountEmpty").classList.toggle(
      "is-hidden",
      state.filtered.account.length > 0,
    );
    pager("account");
  }
  function renderAreaTree() {
    if (!el("areaTree")) return;
    function nodes(parent, level) {
      return data.areas
        .filter(function (x) {
          return x.parentId === parent;
        })
        .map(function (x) {
          var count = configDevices().filter(function (d) {
            return d.areaId === x.id;
          }).length;
          return (
            '<div class="tree-item ' +
            (state.areaId === x.id ? "is-active" : "") +
            '" data-area-id="' +
            x.id +
            '" style="padding-left:' +
            (9 + level * 12) +
            'px"><span>▣</span><span class="tree-name">' +
            esc(x.name) +
            '</span><span class="tree-count">' +
            count +
            '</span><span class="tree-actions"><button class="tree-action" data-area-edit="' +
            x.id +
            '">改</button><button class="tree-action danger" data-area-delete="' +
            x.id +
            '">删</button></span></div>' +
            nodes(x.id, level + 1)
          );
        })
        .join("");
    }
    el("areaTree").innerHTML =
      '<div class="tree-item ' +
      (!state.areaId ? "is-active" : "") +
      '" data-area-id=""><span>▦</span><span class="tree-name">全部区域</span><span class="tree-count">' +
      configDevices().length +
      "</span></div>" +
      nodes("", 0);
  }
  function renderAreaDevices() {
    var rows = state.areaId
      ? configDevices().filter(function (x) {
          return x.areaId === state.areaId;
        })
      : configDevices();
    el("areaDeviceTitle").textContent = state.areaId
      ? areaName(state.areaId) + "设备"
      : "全部区域设备";
    el("areaSummary").textContent = "（共 " + rows.length + " 台）";
    el("areaDeviceRows").innerHTML = rows
      .map(function (x, i) {
        return (
          '<tr><td><button class="action" data-act="edit" data-kind="device" data-id="' +
          x.id +
          '">修改</button><button class="action" data-act="unassign" data-kind="device" data-id="' +
          x.id +
          '">移出区域</button></td><td>' +
          (i + 1) +
          "</td><td>" +
          esc(x.code) +
          "</td><td>" +
          esc(x.name) +
          "</td><td>" +
          esc(typeName(x.typeId)) +
          "</td><td>" +
          esc(areaName(x.areaId)) +
          "</td><td>" +
          yesTag(x.warning) +
          "</td><td>" +
          tag(x.status) +
          "</td></tr>"
        );
      })
      .join("");
    el("areaDeviceEmpty").classList.toggle("is-hidden", rows.length > 0);
  }
  function openModal(title, body, onSave) {
    el("modalTitle").textContent = title;
    el("modalBody").innerHTML = body;
    modalSave = onSave;
    el("modalSave").classList.toggle("is-hidden", !onSave);
    el("modal").classList.remove("is-hidden");
  }
  function closeModal() {
    el("modal").classList.add("is-hidden");
    modalSave = null;
  }
  function val(id) {
    return el(id) ? el(id).value.trim() : "";
  }
  function checked(id) {
    return !!(el(id) && el(id).checked);
  }
  function field(id, label, value, required, type, full) {
    return (
      '<label class="field ' +
      (full ? "full" : "") +
      '"><span class="' +
      (required ? "required" : "") +
      '">' +
      label +
      '</span><input id="' +
      id +
      '" type="' +
      (type || "text") +
      '" value="' +
      esc(value || "") +
      '" ' +
      (required ? "required" : "") +
      " /></label>"
    );
  }
  function viewDevice(id) {
    var x = find(data.devices, id),
      body =
        '<div class="form-grid">' +
        field("vCode", "设备编号", x.code, false) +
        field("vName", "设备名称", x.name, false) +
        field("vType", "设备类型", x.typeName, false) +
        field("vArea", "所属区域", deviceArea(x), false) +
        field("vInst", "仪器业务键", x.instId || "--", false) +
        field("vEndpoint", "采集端标识", x.endpoint || "--", false) +
        field("vConnection", "连接/采集信息", x.connection || "--", false) +
        field("vConfigStatus", "平台配置状态", x.configStatus || "未配置", false) +
        field("vInterval", "采集周期", x.interval ? x.interval + " 秒" : "--", false) +
        field("vWarning", "预警启用", x.configured ? (x.warning ? "已启用" : "未启用") : "未配置", false) +
        field("vConfigTime", "配置更新时间", x.configTime || "--", false) +
        field("vArchiveStatus", "档案状态", x.archiveStatus || "--", false) +
        field("vRunStatus", "最近运行状态", x.runStatus || "--", false) +
        field("vSource", "数据来源", x.source || "--", false) +
        field("vTime", "最近数据时间", x.lastTime || "--", false) +
        field("vHiino", "机构编号", x.hiino || "--", false) +
        field("vDetail", "补充信息", x.detail || "--", false, "text", true) +
        "</div>";
    openModal("设备详情", body, null);
    Array.prototype.forEach.call(
      el("modalBody").querySelectorAll("input"),
      function (n) {
        n.readOnly = true;
      },
    );
  }
  function realDeviceModal(id) {
    var x = find(data.devices, id);
    if (!x.id) {
      toast("未找到设备信息");
      return;
    }
    var areaValue = deviceArea(x);
    if (areaValue === "未设置" || areaValue === "未分区") areaValue = "";
    var body =
      '<div class="form-grid">' +
      '<div class="section-label">设备档案</div>' +
      field("rDeviceCode", "设备编号", x.code || "--", false) +
      field("rDeviceName", "设备名称", x.name || "--", false) +
      field("rDeviceType", "设备类型", x.typeName || "--", false) +
      field("rInstId", "仪器业务键", x.instId || "--", false) +
      field("rArchiveStatus", "档案状态", x.archiveStatus || "--", false) +
      field("rRunStatus", "最近运行状态", x.runStatus || "--", false) +
      '<div class="section-label">接入参数</div>' +
      field("rArea", "所属物联区域", areaValue, false) +
      field("rEndpoint", "采集端标识", x.endpoint || "", false) +
      field("rIp", "IP地址或主机名", x.configIp || "", false) +
      field("rPort", "端口", x.configPort || "", false, "number") +
      field("rInterval", "采集周期（秒）", x.interval || 60, true, "number") +
      '<label class="field"><span>平台配置状态</span><select id="rConfigStatus"><option value="1" ' +
      (x.configStatus !== "停用" ? "selected" : "") +
      '>启用</option><option value="0" ' +
      (x.configStatus === "停用" ? "selected" : "") +
      '>停用</option></select></label>' +
      '<div class="field full"><span>预警启用</span><div class="switch-row"><label class="switch"><input id="rWarning" type="checkbox" ' +
      (x.warning ? "checked" : "") +
      '><span></span></label><b id="rWarningLabel">' +
      (x.warning ? "启用设备预警" : "不启用设备预警") +
      '</b></div></div><label class="field full"><span>配置备注</span><textarea id="rRemark" maxlength="1000">' +
      esc(x.configRemark || "") +
      "</textarea></label></div>";
    openModal("设备接入配置", body, function () {
      var interval = Number(val("rInterval"));
      var port = val("rPort");
      if (!Number.isInteger(interval) || interval < 1 || interval > 86400) {
        toast("采集周期须为 1 至 86400 秒的整数");
        return false;
      }
      if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
        toast("端口须为 1 至 65535 的整数");
        return false;
      }
      var saveButton = el("modalSave");
      var payload = Object.assign({}, x, {
        areaName: val("rArea"),
        endpoint: val("rEndpoint"),
        configIp: val("rIp"),
        configPort: port,
        interval: interval,
        warning: checked("rWarning"),
        configStatus: val("rConfigStatus") === "0" ? "停用" : "启用",
        configRemark: val("rRemark"),
      });
      if (saveButton.disabled) return false;
      var saveButtonText = saveButton.textContent;
      saveButton.disabled = true;
      saveButton.textContent = "保存中...";
      saveButton.setAttribute("aria-busy", "true");
      return S.saveDeviceConfig(payload)
        .then(function () { return S.reloadDevices(data); })
        .then(function (value) {
          data = value;
          closeModal();
          filter("device");
          toast("接入配置已保存");
        })
        .catch(function (error) {
          toast(error.message || "接入配置保存失败");
        })
        .then(function () {
          saveButton.disabled = false;
          saveButton.textContent = saveButtonText;
          saveButton.removeAttribute("aria-busy");
        });
    });
    ["rDeviceCode", "rDeviceName", "rDeviceType", "rInstId", "rArchiveStatus", "rRunStatus"].forEach(function (fieldId) {
      el(fieldId).readOnly = true;
    });
    el("rInterval").min = "1";
    el("rInterval").max = "86400";
    el("rPort").min = "1";
    el("rPort").max = "65535";
    el("rWarning").onchange = function () {
      el("rWarningLabel").textContent = this.checked ? "启用设备预警" : "不启用设备预警";
    };
  }
  function deviceModal(id) {
    var x = id
        ? find(configDevices(), id)
        : { status: "启用", warning: true, interval: 60, params: {} },
      typeOpts = data.types
        .filter(function (t) {
          return t.status === "启用" || t.id === x.typeId;
        })
        .map(function (t) {
          return (
            '<option value="' +
            t.id +
            '" ' +
            (t.id === x.typeId ? "selected" : "") +
            ">" +
            esc(t.name) +
            "</option>"
          );
        })
        .join(""),
      areaOpts =
        '<option value="">未分区</option>' +
        data.areas
          .map(function (a) {
            return (
              '<option value="' +
              a.id +
              '" ' +
              (a.id === x.areaId ? "selected" : "") +
              ">" +
              esc(a.name) +
              "</option>"
            );
          })
          .join("");
    var body =
      '<div class="form-grid">' +
      field("fDeviceCode", "设备编号", x.code, true) +
      field("fDeviceName", "设备名称", x.name, true) +
      '<label class="field"><span class="required">设备类型</span><select id="fDeviceType" required><option value="">请选择</option>' +
      typeOpts +
      '</select></label><label class="field"><span>所属区域</span><select id="fDeviceArea">' +
      areaOpts +
      "</select></label>" +
      field("fInterval", "采集周期（秒）", x.interval || 60, true, "number") +
      '<label class="field"><span>使用状态</span><select id="fDeviceStatus"><option ' +
      (x.status === "启用" ? "selected" : "") +
      ">启用</option><option " +
      (x.status === "停用" ? "selected" : "") +
      '>停用</option></select></label><div class="field full"><span>预警配置</span><div class="switch-row"><label class="switch"><input id="fWarning" type="checkbox" ' +
      (x.warning ? "checked" : "") +
      '><span></span></label><b id="warningLabel">' +
      (x.warning ? "启用设备预警" : "不启用设备预警") +
      '</b></div></div><div class="section-label">设备参数（随设备类型动态变化）</div><div id="dynamicFields" class="field full"></div></div>';
    openModal(id ? "修改设备" : "新增设备", body, function () {
      var typeId = val("fDeviceType");
      if (!typeId || !val("fDeviceCode") || !val("fDeviceName")) {
        toast("请填写设备编号、名称和类型");
        return false;
      }
      var params = {};
      Array.prototype.forEach.call(
        document.querySelectorAll("[data-param-key]"),
        function (n) {
          params[n.dataset.paramKey] = n.value.trim();
        },
      );
      if (
        !id &&
        configDevices().some(function (d) {
          return d.code === val("fDeviceCode");
        })
      ) {
        toast("设备编号已存在");
        return false;
      }
      Object.assign(x, {
        id: x.id || uid("D"),
        code: val("fDeviceCode"),
        name: val("fDeviceName"),
        typeId: typeId,
        areaId: val("fDeviceArea"),
        interval: Number(val("fInterval")) || 60,
        status: val("fDeviceStatus"),
        warning: checked("fWarning"),
        params: params,
        owner: x.owner || "当前用户",
        updateTime: now(),
      });
      if (!id) configDevices().push(x);
      return persist("设备配置已保存");
    });
    el("fDeviceType").onchange = function () {
      renderDynamicFields(this.value, x.params);
    };
    el("fWarning").onchange = function () {
      el("warningLabel").textContent = this.checked
        ? "启用设备预警"
        : "不启用设备预警";
    };
    renderDynamicFields(x.typeId, x.params);
  }
  function renderDynamicFields(typeId, params) {
    var t = find(data.types, typeId),
      node = el("dynamicFields");
    node.innerHTML = t.id
      ? '<div class="form-grid">' +
        t.fields
          .map(function (f) {
            return (
              '<label class="field"><span class="' +
              (f.required ? "required" : "") +
              '">' +
              esc(f.name) +
              (f.unit ? "（" + esc(f.unit) + "）" : "") +
              '</span><input data-param-key="' +
              esc(f.key) +
              '" type="' +
              (f.type === "number" ? "number" : "text") +
              '" value="' +
              esc((params || {})[f.key] || "") +
              '" ' +
              (f.required ? "required" : "") +
              "></label>"
            );
          })
          .join("") +
        "</div>"
      : '<p class="hint">请先选择设备类型。</p>';
  }
  function typeModal(id) {
    var x = id ? find(data.types, id) : { status: "启用", fields: [] };
    var body =
      '<div class="form-grid">' +
      field("fTypeCode", "类型编码", x.code, true) +
      field("fTypeName", "类型名称", x.name, true) +
      '<label class="field"><span>使用状态</span><select id="fTypeStatus"><option ' +
      (x.status === "启用" ? "selected" : "") +
      ">启用</option><option " +
      (x.status === "停用" ? "selected" : "") +
      ">停用</option></select></label>" +
      field("fTypeDesc", "类型说明", x.description, false, "text", true) +
      '<div class="section-label">配置项定义</div><div id="configRows" class="field full"></div><button type="button" id="addConfig" class="add-config">＋ 添加配置项</button></div>';
    openModal(id ? "修改设备类型" : "新增设备类型", body, function () {
      if (!val("fTypeCode") || !val("fTypeName")) {
        toast("请填写类型编码和名称");
        return false;
      }
      var fields = [];
      Array.prototype.forEach.call(
        document.querySelectorAll(".config-row"),
        function (r) {
          var ins = r.querySelectorAll("input,select"),
            name = ins[1].value.trim(),
            key = ins[0].value.trim();
          if (key && name)
            fields.push({
              key: key,
              name: name,
              type: ins[2].value,
              unit: ins[3].value.trim(),
              required: ins[4].checked,
            });
        },
      );
      if (!fields.length) {
        toast("请至少添加一个配置项");
        return false;
      }
      Object.assign(x, {
        id: x.id || uid("T"),
        code: val("fTypeCode"),
        name: val("fTypeName"),
        status: val("fTypeStatus"),
        description: val("fTypeDesc"),
        fields: fields,
        updateTime: now(),
      });
      if (!id) data.types.push(x);
      return persist("设备类型已保存");
    });
    function addRow(f) {
      var n = document.createElement("div");
      n.className = "config-row";
      n.innerHTML =
        '<input placeholder="参数编码" value="' +
        esc(f.key || "") +
        '"><input placeholder="参数名称" value="' +
        esc(f.name || "") +
        '"><select><option value="text">文本</option><option value="number" ' +
        (f.type === "number" ? "selected" : "") +
        '>数字</option></select><input placeholder="单位" value="' +
        esc(f.unit || "") +
        '"><label title="是否必填"><input type="checkbox" ' +
        (f.required ? "checked" : "") +
        '>必填</label><button type="button" class="mini-button">删除</button>';
      n.querySelector("button").onclick = function () {
        n.remove();
      };
      el("configRows").appendChild(n);
    }
    x.fields.forEach(addRow);
    el("addConfig").onclick = function () {
      addRow({});
    };
  }
  var PERMS = [
    "设备查看",
    "设备配置",
    "区域管理",
    "用户授权",
    "预警设置",
    "预警处理",
    "数据导出",
  ];
  function accountModal(id) {
    var x = id
      ? find(data.accounts, id)
      : { status: "启用", permissions: [], areaIds: [] };
    var checks = PERMS.map(function (p) {
        return (
          '<label class="check-item"><input type="checkbox" data-permission="' +
          p +
          '" ' +
          (x.permissions.indexOf(p) >= 0 ? "checked" : "") +
          ">" +
          p +
          "</label>"
        );
      }).join(""),
      areas = data.areas
        .map(function (a) {
          return (
            '<label class="check-item"><input type="checkbox" data-account-area="' +
            a.id +
            '" ' +
            (x.areaIds.indexOf(a.id) >= 0 ? "checked" : "") +
            ">" +
            esc(a.name) +
            "</label>"
          );
        })
        .join("");
    var body =
      '<div class="form-grid">' +
      field("fUsername", "用户账号", x.username, true) +
      field("fAccountName", "用户名称", x.name, true) +
      (id
        ? ""
        : '<label class="field"><span class="required">初始密码</span><input id="fPassword" type="password" required autocomplete="new-password"><small class="hint">演示数据不保存密码明文</small></label>') +
      '<label class="field"><span>账号状态</span><select id="fAccountStatus"><option ' +
      (x.status === "启用" ? "selected" : "") +
      ">启用</option><option " +
      (x.status === "停用" ? "selected" : "") +
      ">停用</option><option " +
      (x.status === "锁定" ? "selected" : "") +
      '>锁定</option></select></label><div class="field full"><span class="required">权限范围</span><div class="checkbox-grid">' +
      checks +
      '</div></div><div class="field full"><span>授权区域</span><div class="checkbox-grid">' +
      areas +
      "</div></div></div>";
    openModal(id ? "修改物联用户" : "新增物联用户", body, function () {
      if (
        !val("fUsername") ||
        !val("fAccountName") ||
        (!id && !val("fPassword"))
      ) {
        toast("请填写必填项");
        return false;
      }
      var permissions = Array.prototype.filter
          .call(document.querySelectorAll("[data-permission]"), function (n) {
            return n.checked;
          })
          .map(function (n) {
            return n.dataset.permission;
          }),
        areaIds = Array.prototype.filter
          .call(document.querySelectorAll("[data-account-area]"), function (n) {
            return n.checked;
          })
          .map(function (n) {
            return n.dataset.accountArea;
          });
      if (!permissions.length) {
        toast("请至少选择一项权限");
        return false;
      }
      Object.assign(x, {
        id: x.id || uid("U"),
        username: val("fUsername"),
        name: val("fAccountName"),
        status: val("fAccountStatus"),
        permissions: permissions,
        areaIds: areaIds,
        lastLogin: x.lastLogin || "--",
        updateTime: now(),
      });
      if (!id) data.accounts.push(x);
      return persist("物联用户已保存，密码未写入前端存储");
    });
  }
  function areaModal(id) {
    var x = id ? find(data.areas, id) : {},
      parents = data.areas
        .filter(function (a) {
          return a.id !== id;
        })
        .map(function (a) {
          return (
            '<option value="' +
            a.id +
            '" ' +
            (a.id === x.parentId ? "selected" : "") +
            ">" +
            esc(a.name) +
            "</option>"
          );
        })
        .join("");
    var body =
      '<div class="form-grid">' +
      field("fAreaCode", "区域编码", x.code, true) +
      field("fAreaName", "区域名称", x.name, true) +
      '<label class="field"><span>上级区域</span><select id="fAreaParent"><option value="">无上级区域</option>' +
      parents +
      "</select></label>" +
      field("fAreaDesc", "区域说明", x.description, false, "text", true) +
      "</div>";
    openModal(id ? "修改区域" : "新增区域", body, function () {
      if (!val("fAreaCode") || !val("fAreaName")) {
        toast("请填写区域编码和名称");
        return false;
      }
      Object.assign(x, {
        id: x.id || uid("A"),
        code: val("fAreaCode"),
        name: val("fAreaName"),
        parentId: val("fAreaParent"),
        description: val("fAreaDesc"),
      });
      if (!id) data.areas.push(x);
      return persist("区域配置已保存");
    });
  }
  function assignModal() {
    var devices = configDevices()
      .map(function (d) {
        return (
          '<label class="check-item"><input type="checkbox" data-assign-device="' +
          d.id +
          '" ' +
          (d.areaId === state.areaId ? "checked" : "") +
          ">" +
          esc(d.name) +
          "</label>"
        );
      })
      .join("");
    openModal(
      "分配设备到" + (state.areaId ? areaName(state.areaId) : "未分区"),
      '<div class="checkbox-grid">' + devices + "</div>",
      function () {
        Array.prototype.forEach.call(
          document.querySelectorAll("[data-assign-device]"),
          function (n) {
            var d = find(configDevices(), n.dataset.assignDevice);
            if (n.checked) d.areaId = state.areaId;
            else if (d.areaId === state.areaId) d.areaId = "";
          },
        );
        return persist("设备分组已更新");
      },
    );
  }
  function persist(msg) {
    return S.saveAll(data)
      .then(function (v) {
        data = v;
        closeModal();
        filterAll();
        toast(msg);
        return true;
      })
      .catch(function (e) {
        toast(e.message || "保存失败");
        return false;
      });
  }
  function filterAll() {
    filter("device");
    filter("type");
    filter("account");
    renderAreaDevices();
  }
  function confirmDo(text, fn) {
    el("confirmText").textContent = text;
    el("confirm").classList.remove("is-hidden");
    el("confirmOk").onclick = function () {
      el("confirm").classList.add("is-hidden");
      fn();
    };
    el("confirmCancel").onclick = function () {
      el("confirm").classList.add("is-hidden");
    };
  }
  function remove(kind, id) {
    var rows =
        kind === "device"
          ? configDevices()
          : kind === "type"
            ? data.types
            : kind === "account"
              ? data.accounts
              : data.areas,
      x = find(rows, id);
    if (
      kind === "type" &&
      configDevices().some(function (d) {
        return d.typeId === id;
      })
    ) {
      toast("该类型已有设备，不能删除");
      return;
    }
    if (
      kind === "area" &&
      (configDevices().some(function (d) {
        return d.areaId === id;
      }) ||
        data.areas.some(function (a) {
          return a.parentId === id;
        }))
    ) {
      toast("区域包含设备或下级区域，不能删除");
      return;
    }
    confirmDo("确认删除“" + (x.name || x.username) + "”吗？", function () {
      rows.splice(rows.indexOf(x), 1);
      persist("已删除");
    });
  }
  function bind() {
    document.querySelector(".page-tabs").onclick = function (e) {
      var tab = e.target.dataset.tab;
      if (!tab) return;
      state.tab = tab;
      document.querySelectorAll(".page-tab").forEach(function (n) {
        n.classList.toggle("is-active", n.dataset.tab === tab);
      });
      document.querySelectorAll(".tab-panel").forEach(function (n) {
        n.classList.add("is-hidden");
      });
      el(tab + "Panel").classList.remove("is-hidden");
      if (tab === "area") renderAreaDevices();
    };
    document.body.onclick = function (e) {
      var n = e.target;
      if (n.dataset.closeModal !== undefined) {
        closeModal();
        return;
      }
      if (n.dataset.refreshDevices !== undefined) {
        n.disabled = true;
        S.reloadDevices(data)
          .then(function (v) {
            data = v;
            filter("device");
            toast("设备列表已刷新");
          })
          .catch(function (error) {
            toast(error.message || "设备数据加载失败");
          })
          .then(function () {
            n.disabled = false;
          });
        return;
      }
      if (n.dataset.search) {
        filter(n.dataset.search);
        return;
      }
      if (n.dataset.reset) {
        var panel = el(n.dataset.reset + "Panel");
        panel.querySelectorAll("input,select").forEach(function (x) {
          x.value = "";
        });
        filter(n.dataset.reset);
        return;
      }
      if (n.dataset.add) {
        ({
          device: deviceModal,
          type: typeModal,
          account: accountModal,
          area: areaModal,
        })[n.dataset.add]();
        return;
      }
      if (n.dataset.pageName) {
        var name = n.dataset.pageName,
          pages = Math.ceil(state.filtered[name].length / PAGE),
          p = Number(n.dataset.page),
          dir = Number(n.dataset.dir);
        state.page[name] =
          p || Math.max(1, Math.min(pages, state.page[name] + dir));
        render(name);
        return;
      }
      if (n.dataset.act) {
        var kind = n.dataset.kind,
          id = n.dataset.id;
        if (n.dataset.act === "view-device") viewDevice(id);
        if (n.dataset.act === "configure-device") realDeviceModal(id);
        if (n.dataset.act === "edit")
          ({ device: deviceModal, type: typeModal, account: accountModal })[
            kind
          ](id);
        if (n.dataset.act === "delete") remove(kind, id);
        if (n.dataset.act === "reset-password")
          toast("密码重置需接入安全的服务端提交 SQL");
        if (n.dataset.act === "unassign") {
          find(configDevices(), id).areaId = "";
          persist("设备已移出区域");
        }
        return;
      }
      if (n.dataset.areaId !== undefined) {
        state.areaId = n.dataset.areaId;
        renderAreaTree();
        renderAreaDevices();
        return;
      }
      if (n.dataset.areaEdit) {
        areaModal(n.dataset.areaEdit);
        return;
      }
      if (n.dataset.areaDelete) {
        remove("area", n.dataset.areaDelete);
        return;
      }
    };
    el("modalForm").onsubmit = function (e) {
      e.preventDefault();
      if (modalSave) Promise.resolve(modalSave());
    };
    el("assignDevice").onclick = assignModal;
    document.querySelectorAll("[data-jump-name]").forEach(function () {});
    document.body.onchange = function (e) {
      var name = e.target.dataset.jumpName;
      if (!name) return;
      var pages = Math.ceil(state.filtered[name].length / PAGE),
        p = Number(e.target.value);
      if (p >= 1 && p <= pages) {
        state.page[name] = p;
        render(name);
      } else toast("请输入有效页码");
    };
  }
  function init() {
    bind();
    S.loadAll()
      .then(function (v) {
        data = v;
        filterAll();
      })
      .catch(function (e) {
        toast(e.message || "页面数据加载失败");
      });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
