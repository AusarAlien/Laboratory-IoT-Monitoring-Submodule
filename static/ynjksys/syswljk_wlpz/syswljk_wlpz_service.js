(function (global) {
  "use strict";
  var CONFIG = { defaultDbnm: "ynjk", qids: { devices: "ynjksys_wljk_pz_sb01q" } };
  var currentDevices = [];

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function common() {
    var params = typeof global.buildCommonParams === "function" ? global.buildCommonParams() || {} : {};
    params.hp = params.hp || "ynjksys";
    if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) params.dbnm = CONFIG.defaultDbnm;
    return params;
  }
  function objectRows(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (global.isqrydata && typeof global.isqrydata.convertDataToObject === "function") return global.isqrydata.convertDataToObject(result.data, result.title || []);
    return result.data.map(function (row) { var item = {}; (result.title || []).forEach(function (title, index) { item[title] = row[index]; }); return item; });
  }
  function field(row, name) {
    var upper = name.toUpperCase(), key;
    if (!row) return "";
    if (row[upper] != null) return row[upper];
    if (row[name] != null) return row[name];
    for (key in row) if (Object.prototype.hasOwnProperty.call(row, key) && key.toUpperCase() === upper) return row[key];
    return "";
  }
  function query(qid) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") { reject(new Error("数据服务暂不可用")); return; }
      global.isqrydata.query({
        qid: qid,
        data: common(),
        successCallback: function (result) {
          if (result && String(result.success).toLowerCase() === "false" && String(result.message || "").indexOf("querydata") >= 0) { resolve([]); return; }
          if (result && String(result.success).toLowerCase() === "false") { reject(new Error(result.message || "设备数据加载失败")); return; }
          resolve(objectRows(result));
        },
        errorCallback: function (error) { reject(error || new Error("设备数据加载失败")); },
      });
    });
  }
  function mapDevice(row) {
    var typeCode = String(field(row, "FDEVICETYPECODE") || "INSTRUMENT");
    return {
      id: String(field(row, "FDEVICEKEY") || ""), code: String(field(row, "FDEVICECODE") || ""), name: String(field(row, "FDEVICENAME") || ""),
      typeId: "REAL-" + typeCode, typeCode: typeCode, typeName: String(field(row, "FDEVICETYPE") || "仪器设备档案"),
      areaName: String(field(row, "FAREA") || "未设置"), endpoint: String(field(row, "FENDPOINT") || ""), connection: String(field(row, "FCONNECTION") || ""),
      status: String(field(row, "FARCHIVESTATUS") || "未设置"), source: String(field(row, "FDATASOURCE") || ""), lastTime: String(field(row, "FLASTDATATIME") || ""),
      hiino: String(field(row, "FHIINO") || ""), connected: Number(field(row, "FCONNECTED")) === 1,
      instId: String(field(row, "FINSTID") || ""), socket: String(field(row, "FSSID") || ""), deviceIp: String(field(row, "FDEVICEIP") || ""),
      detail: String(field(row, "FDETAIL") || ""), readonly: true,
    };
  }
  function auxiliaryData() {
    if (!global.SyswljkConfigMock || typeof global.SyswljkConfigMock.load !== "function") return { types: [], devices: [], areas: [], accounts: [] };
    return global.SyswljkConfigMock.load();
  }
  function merge(realDevices, auxiliary) {
    return { types: clone(auxiliary.types || []), devices: realDevices.slice(), configDevices: clone(auxiliary.devices || []), areas: clone(auxiliary.areas || []), accounts: clone(auxiliary.accounts || []) };
  }
  function loadAll() {
    var auxiliary = auxiliaryData();
    return query(CONFIG.qids.devices).then(function (rows) { currentDevices = rows.map(mapDevice); return merge(currentDevices, auxiliary); });
  }
  function reloadDevices(data) {
    return query(CONFIG.qids.devices).then(function (rows) { currentDevices = rows.map(mapDevice); data.devices = currentDevices.slice(); return data; });
  }
  function saveAll(data) {
    var auxiliary = { types: clone(data.types || []), devices: clone(data.configDevices || []), areas: clone(data.areas || []), accounts: clone(data.accounts || []) };
    if (!global.SyswljkConfigMock || typeof global.SyswljkConfigMock.save !== "function") return Promise.resolve(merge(currentDevices, auxiliary));
    return Promise.resolve(global.SyswljkConfigMock.save(auxiliary)).then(function (saved) { return merge(currentDevices, saved); });
  }

  /* 主设备清单只读取注册 SQL，查询失败时不会切换到示例设备。 */
  global.SyswljkConfigService = { config: CONFIG, loadAll: loadAll, reloadDevices: reloadDevices, saveAll: saveAll };
})(window);
