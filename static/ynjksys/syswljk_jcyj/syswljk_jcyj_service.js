(function (global) {
  "use strict";

  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: {
      alarms: "ynjksys_wljk_jcyj_bj01q",
      devices: "ynjksys_hjjc_wsd_sb01q",
      standards: "ynjksys_hjjc_wsd_bz01q",
      rules: "ynjksys_wljk_jcyj_gz01q",
      saveRule: "ynjksys_wljk_jcyj_gz01s",
    },
  };

  function common() {
    var p = typeof global.buildCommonParams === "function" ? global.buildCommonParams() || {} : {};
    p.hp = p.hp || "ynjksys";
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm))) p.dbnm = CONFIG.defaultDbnm;
    return p;
  }

  function objectRows(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (global.isqrydata && typeof global.isqrydata.convertDataToObject === "function")
      return global.isqrydata.convertDataToObject(result.data, result.title || []);
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, index) { item[title] = row[index]; });
      return item;
    });
  }

  function field(row, name) {
    var upper = name.toUpperCase();
    if (!row) return "";
    if (row[upper] != null) return row[upper];
    if (row[name] != null) return row[name];
    for (var key in row)
      if (Object.prototype.hasOwnProperty.call(row, key) && key.toUpperCase() === upper) return row[key];
    return "";
  }

  function query(qid, business) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) {
        reject(new Error("数据服务暂不可用"));
        return;
      }
      var p = common();
      Object.keys(business || {}).forEach(function (key) { p[key] = business[key]; });
      global.isqrydata.query({
        qid: qid,
        data: p,
        successCallback: function (result) {
          global.SyswljkQueryGuard.settle(result, { qid: qid, resolve: resolve, reject: reject, map: objectRows, message: "数据加载失败" });
        },
        errorCallback: reject,
      });
    });
  }

  function params(filters) {
    filters = filters || {};
    return {
      alarm_type_sql_equal: filters.alarmType || null,
      metric_sql_equal: filters.metric || null,
      device_sql_equal: filters.device || null,
      keyword_sql_equal: filters.keyword || null,
      level_sql_equal: filters.level || null,
      status_sql_equal: filters.status || null,
      start_time_sql_equal: filters.startTime || null,
      end_time_sql_equal: filters.endTime || null,
    };
  }

  function mapAlarm(row) {
    return {
      id: String(field(row, "FALARMID") || ""),
      typeCode: String(field(row, "FALARMTYPECODE") || ""),
      type: String(field(row, "FALARMTYPE") || "其他报警"),
      sourceCode: String(field(row, "FSOURCECODE") || ""),
      deviceId: String(field(row, "FDEVICEID") || ""),
      deviceCode: String(field(row, "FDEVICECODE") || ""),
      deviceName: String(field(row, "FDEVICENAME") || "环境监测设备"),
      location: String(field(row, "FLOCATION") || "未匹配"),
      dept: String(field(row, "FDEPTNO") || "未设置"),
      metricCode: String(field(row, "FMETRICCODE") || ""),
      metric: String(field(row, "FMETRICNAME") || ""),
      unit: String(field(row, "FUNIT") || ""),
      value: String(field(row, "FVALUE") || ""),
      condition: String(field(row, "FCONDITION") || ""),
      level: String(field(row, "FLEVEL") || "未设置"),
      status: String(field(row, "FSTATUS") || "未知"),
      valid: String(field(row, "FIFVALID") || ""),
      dealt: String(field(row, "FIFDEAL") || ""),
      time: String(field(row, "FALARMTIME") || ""),
    };
  }

  function devicesOf(alarms) {
    var seen = {};
    return alarms.filter(function (alarm) {
      if (!alarm.deviceId || seen[alarm.deviceId]) return false;
      seen[alarm.deviceId] = true;
      return true;
    }).map(function (alarm) {
      return { id: alarm.deviceId, code: alarm.deviceCode, name: alarm.deviceName, area: alarm.location, dept: alarm.dept, type: "环境监测设备" };
    });
  }

  function mapDevice(row) {
    return {
      id: String(field(row, "FDEVICEIP") || field(row, "FDEVICEID") || ""),
      code: String(field(row, "FDEVICEIP") || ""),
      name: String(field(row, "FDEVICENAME") || field(row, "FLOCATION") || "环境监测设备"),
      area: String(field(row, "FLOCATION") || field(row, "FDEVICENAME") || "未设置"),
      dept: String(field(row, "FDEPTNO") || "未设置"),
      type: String(field(row, "FDEVICETYPE") || "温湿度监测设备"),
    };
  }

  function mapStandard(row) {
    return {
      id: String(field(row, "FSTANDARDID") || ""),
      code: String(field(row, "FMETRICCODE") || field(row, "FSTANDARDID") || ""),
      name: String(field(row, "FMETRICNAME") || ""),
      unit: String(field(row, "FUNIT") || ""),
      lower: field(row, "FLOWER") === "" ? null : Number(field(row, "FLOWER")),
      upper: field(row, "FUPPER") === "" ? null : Number(field(row, "FUPPER")),
    };
  }

  function mapRule(row) {
    return {
      id: String(field(row, "FRULEID") || ""),
      name: String(field(row, "FRULENAME") || ""),
      deviceType: String(field(row, "FDEVICETYPE") || "温湿度监测设备"),
      targetType: String(field(row, "FTARGETTYPE") || "ALL"),
      targetId: String(field(row, "FTARGETID") || ""),
      targetName: String(field(row, "FTARGETNAME") || "全部同类设备"),
      metricId: String(field(row, "FITEMNO") || ""),
      metric: String(field(row, "FMETRICNAME") || field(row, "FITEMNO") || ""),
      unit: String(field(row, "FUNIT") || ""),
      lower: field(row, "FLOWER") === "" ? null : Number(field(row, "FLOWER")),
      upper: field(row, "FUPPER") === "" ? null : Number(field(row, "FUPPER")),
      count: Number(field(row, "FCONTCOUNT")) || 1,
      duration: Number(field(row, "FDURATION")) || 0,
      level: String(field(row, "FALARMLEVEL") || "一般"),
      push: String(field(row, "FPUSHPLATFORM") || "0") === "1",
      status: String(field(row, "FSTATUS") || "1") === "1" ? "启用" : "停用",
      effectiveBegin: String(field(row, "FEFFECTIVEBEGIN") || ""),
      effectiveEnd: String(field(row, "FEFFECTIVEEND") || ""),
      remark: String(field(row, "FREMARK") || ""),
      operator: String(field(row, "FEMPNAME") || field(row, "FEMPID") || ""),
      updateTime: String(field(row, "FUPDATETIME") || ""),
    };
  }

  function saveRule(operation, rule) {
    return new Promise(function (resolve, reject) {
      if (!global.issubmit || typeof global.issubmit.submit !== "function") {
        reject(new Error("数据保存服务暂不可用"));
        return;
      }
      var item = {
        "数据状态": operation,
        FRULEID: rule.id || "",
        FRULENAME: rule.name || "",
        FDEVICETYPE: rule.deviceType || "温湿度监测设备",
        FTARGETTYPE: rule.targetType || "ALL",
        FTARGETID: rule.targetId || "",
        FITEMNO: rule.metricId || "",
        FLOWER: rule.lower == null ? "" : rule.lower,
        FUPPER: rule.upper == null ? "" : rule.upper,
        FCONTCOUNT: rule.count || 1,
        FDURATION: rule.duration || 0,
        FALARMLEVEL: rule.level || "一般",
        FPUSHPLATFORM: rule.push ? "1" : "0",
        FSTATUS: rule.status === "停用" ? "0" : "1",
        FEFFECTIVEBEGIN: rule.effectiveBegin || "",
        FEFFECTIVEEND: rule.effectiveEnd || "",
        FREMARK: rule.remark || "",
      };
      global.issubmit.submit({
        qid: CONFIG.qids.saveRule,
        data: [item],
        successCallback: function (result) {
          if (result && (String(result.success).toLowerCase() === "false" || /失败/.test(String(result.message || "")))) {
            reject(new Error(result.message || "规则保存失败"));
            return;
          }
          resolve(result || {});
        },
        errorCallback: reject,
      });
    });
  }

  function loadAlarms(filters) {
    return query(CONFIG.qids.alarms, params(filters)).then(function (rows) { return rows.map(mapAlarm); });
  }

  /* Mock 降级代码保留但不启用：
     return Promise.resolve(global.SyswljkWarningMock.load());
     正式查询失败时不自动切换模拟数据。 */
  global.SyswljkWarningService = {
    config: CONFIG,
    loadAlarms: loadAlarms,
    loadAll: function () {
      return loadAlarms({}).then(function (alarms) {
        return { devices: devicesOf(alarms), alarms: alarms, rules: [], pushes: [] };
      });
    },
    loadRuleContext: function () {
      return Promise.all([
        query(CONFIG.qids.devices, {}).then(function (rows) { return rows.map(mapDevice); }),
        query(CONFIG.qids.standards, {}).then(function (rows) { return rows.map(mapStandard); }),
        query(CONFIG.qids.rules, {}).then(function (rows) { return rows.map(mapRule); }),
      ]).then(function (result) {
        return { devices: result[0], standards: result[1], rules: result[2] };
      });
    },
    saveRule: saveRule,
  };
})(window);
