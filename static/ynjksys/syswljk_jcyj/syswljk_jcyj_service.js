(function (global) {
  "use strict";

  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: { alarms: "ynjksys_wljk_jcyj_bj01q" },
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
  };
})(window);
