(function (global) {
  "use strict";
  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: {
      devices: "ynjksys_hjjc_wsd_sb01q",
      standards: "ynjksys_hjjc_wsd_bz01q",
      records: "ynjksys_hjjc_wsd_jl01q",
      summary: "ynjksys_hjjc_wsd_jl02q",
      latest: "ynjksys_hjjc_wsd_zx01q",
      trend: "ynjksys_hjjc_wsd_qs01q",
    },
  };
  function objectRows(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (global.isqrydata && typeof global.isqrydata.convertDataToObject === "function")
      return global.isqrydata.convertDataToObject(result.data, result.title || []);
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, i) { item[title] = row[i]; });
      return item;
    });
  }
  function field(row, name) {
    if (!row) return "";
    var upper = name.toUpperCase(), key;
    if (row[upper] != null) return row[upper];
    if (row[name] != null) return row[name];
    for (key in row) if (Object.prototype.hasOwnProperty.call(row, key) && key.toUpperCase() === upper) return row[key];
    return "";
  }
  function number(v) { return v === "" || v == null ? null : Number(v); }
  function common() {
    var p = typeof global.buildCommonParams === "function" ? global.buildCommonParams() || {} : {};
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm))) p.dbnm = CONFIG.defaultDbnm;
    p.hp = p.hp || "ynjksys";
    return p;
  }
  function query(qid, business) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) { reject(new Error("数据服务暂不可用")); return; }
      var params = common();
      Object.keys(business || {}).forEach(function (key) { params[key] = business[key]; });
      global.isqrydata.query({
        qid: qid,
        data: params,
        successCallback: function (result) {
          global.SyswljkQueryGuard.settle(result, { qid: qid, resolve: resolve, reject: reject, map: objectRows, message: "数据加载失败" });
        },
        errorCallback: reject,
      });
    });
  }
  function filterParams(f) {
    f = f || {};
    return {
      start_time_sql_equal: f.startTime || null,
      end_time_sql_equal: f.endTime || null,
      device_sql_equal: f.device || null,
      dept_no_sql_equal: f.dept || null,
      metric_sql_equal: f.metric || null,
      status_sql_equal: f.status || null,
    };
  }
  function mapDevice(r) {
    return {
      id: String(field(r, "FDEVICEID") || field(r, "FDEVICEIP")),
      ip: String(field(r, "FDEVICEIP") || ""),
      code: String(field(r, "FDEVICEIP") || ""),
      name: String(field(r, "FDEVICENAME") || field(r, "FDEVICEIP") || ""),
      dept: String(field(r, "FDEPTNO") || "未设置"),
      area: String(field(r, "FDEPTNO") || "未设置"),
      hiino: String(field(r, "FHIINO") || ""),
      depotSeq: String(field(r, "FDEPOTSEQ") || ""),
      type: String(field(r, "FDEVICETYPE") || "温湿度监测设备"),
      location: String(field(r, "FLOCATION") || field(r, "FDEVICENAME") || ""),
      description: String(field(r, "FDEVICEDESC") || ""),
    };
  }
  function mapRecord(r) {
    return {
      rowNo: number(field(r, "FROWSEQ")),
      id: String(field(r, "FRECORDID") || ""),
      sourceId: String(field(r, "FCRSEQ") || ""),
      deviceId: String(field(r, "FDEVICEID") || field(r, "FDEVICEIP") || ""),
      deviceIp: String(field(r, "FDEVICEIP") || ""),
      deviceName: String(field(r, "FDEVICENAME") || field(r, "FDEVICEIP") || ""),
      dept: String(field(r, "FDEPTNO") || "未设置"),
      deviceType: "温湿度监测设备",
      metricCode: String(field(r, "FMETRICCODE") || ""),
      metricName: String(field(r, "FMETRICNAME") || ""),
      value: number(field(r, "FVALUE")),
      unit: String(field(r, "FUNIT") || ""),
      lower: number(field(r, "FLOWER")),
      upper: number(field(r, "FUPPER")),
      status: String(field(r, "FSTATUS") || "无效"),
      alarm: String(field(r, "FALARMDESC") || ""),
      time: String(field(r, "FRECORDTIME") || ""),
      operator: String(field(r, "FEMPID") || ""),
      remark: String(field(r, "FREMARK") || ""),
      total: number(field(r, "FTOTALCOUNT")) || 0,
    };
  }
  function mapSummary(r) {
    return {
      total: number(field(r, "FRECORDCOUNT")) || 0,
      devices: number(field(r, "FDEVICECOUNT")) || 0,
      metrics: number(field(r, "FMETRICCOUNT")) || 0,
      normal: number(field(r, "FNORMALCOUNT")) || 0,
      alarm: number(field(r, "FALARMCOUNT")) || 0,
      invalid: number(field(r, "FINVALIDCOUNT")) || 0,
      today: number(field(r, "FTODAYCOUNT")) || 0,
    };
  }
  /* 模拟数据降级方案保留但不启用：
     页面离线演示时，可恢复原 mock.js 引用，并将对应 load 方法显式改为读取 SyswljkEnvMock。
     查询异常时不会自动切换模拟数据，避免真实数据与演示数据混合。 */
  global.SyswljkWsdService = {
    config: CONFIG,
    loadDevices: function () { return query(CONFIG.qids.devices, {}).then(function (rows) { return rows.map(mapDevice); }); },
    loadStandards: function () { return query(CONFIG.qids.standards, {}); },
    loadRecords: function (f) {
      var p = filterParams(f); p.page_sql_equal = (f && f.page) || 1; p.page_size_sql_equal = (f && f.pageSize) || 20;
      return query(CONFIG.qids.records, p).then(function (rows) { return rows.map(mapRecord); });
    },
    loadSummary: function (f) { return query(CONFIG.qids.summary, filterParams(f)).then(function (rows) { return mapSummary(rows[0] || {}); }); },
    loadLatest: function (f) { return query(CONFIG.qids.latest, filterParams(f)).then(function (rows) { return rows.map(mapRecord); }); },
    loadTrend: function (f) { return query(CONFIG.qids.trend, filterParams(f)).then(function (rows) { return rows.map(mapRecord); }); },
  };
})(window);
