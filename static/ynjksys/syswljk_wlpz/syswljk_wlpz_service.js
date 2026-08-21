(function (global) {
  "use strict";
  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: {
      devices: "ynjksys_wljk_pz_sb01q",
      saveDevice: "ynjksys_wljk_pz_sb01s",
    },
  };
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
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) { reject(new Error("数据服务暂不可用")); return; }
      global.isqrydata.query({
        qid: qid,
        data: common(),
        successCallback: function (result) { global.SyswljkQueryGuard.settle(result, { qid: qid, resolve: resolve, reject: reject, map: objectRows, message: "设备数据加载失败" }); },
        errorCallback: function (error) { reject(error || new Error("设备数据加载失败")); },
      });
    });
  }
  function mapDevice(row) {
    var typeCode = String(field(row, "FDEVICETYPECODE") || "INSTRUMENT");
    var configured = Number(field(row, "FCONFIGURED")) === 1;
    var configStatusValue = String(field(row, "FCONFIGSTATUS") || "");
    return {
      id: String(field(row, "FDEVICEKEY") || ""), code: String(field(row, "FDEVICECODE") || ""), name: String(field(row, "FDEVICENAME") || ""),
      typeId: "REAL-" + typeCode, typeCode: typeCode, typeName: String(field(row, "FDEVICETYPE") || "仪器设备档案"),
      areaName: String(field(row, "FAREA") || "未设置"), endpoint: String(field(row, "FENDPOINT") || ""), connection: String(field(row, "FCONNECTION") || ""),
      archiveStatus: String(field(row, "FARCHIVESTATUS") || "未设置"),
      runStatus: String(field(row, "FRUNSTATUS") || "--"),
      status: String(field(row, "FARCHIVESTATUS") || "未设置"), source: String(field(row, "FDATASOURCE") || ""), lastTime: String(field(row, "FLASTDATATIME") || ""),
      hiino: String(field(row, "FHIINO") || ""), connected: Number(field(row, "FCONNECTED")) === 1,
      instId: String(field(row, "FINSTID") || ""), socket: String(field(row, "FSSID") || ""), deviceIp: String(field(row, "FDEVICEIP") || ""),
      detail: String(field(row, "FDETAIL") || ""), readonly: true,
      configId: String(field(row, "FCONFIGID") || ""), configured: configured,
      configIp: String(field(row, "FCONFIGIP") || ""), configPort: String(field(row, "FCONFIGPORT") || ""),
      interval: field(row, "FACQPERIOD") === "" ? null : Number(field(row, "FACQPERIOD")),
      warning: String(field(row, "FWARN") || "0") === "1",
      configStatus: configured ? (configStatusValue === "0" ? "停用" : "启用") : "未配置",
      configRemark: String(field(row, "FCONFIGREMARK") || ""), configTime: String(field(row, "FCONFIGTIME") || ""),
    };
  }

  function saveDeviceConfig(device) {
    return new Promise(function (resolve, reject) {
      if (!global.issubmit || typeof global.issubmit.submit !== "function") {
        reject(new Error("数据保存服务暂不可用"));
        return;
      }
      global.issubmit.submit({
        qid: CONFIG.qids.saveDevice,
        data: [{
          "数据状态": device.configured ? "修改" : "新增",
          FDEVICEKEY: device.id,
          FAREA: device.areaName || "",
          FENDPOINT: device.endpoint || "",
          FIP: device.configIp || "",
          FPORT: device.configPort || "",
          FACQPERIOD: device.interval,
          FWARN: device.warning ? "1" : "0",
          FSTATUS: device.configStatus === "停用" ? "0" : "1",
          FREMARK: device.configRemark || "",
        }],
        successCallback: function (result) {
          if (result && (String(result.success).toLowerCase() === "false" || /失败|重试/.test(String(result.message || "")))) {
            reject(new Error(result.message || "设备配置保存失败"));
            return;
          }
          resolve(result || {});
        },
        errorCallback: function (error) { reject(error || new Error("设备配置保存失败")); },
      });
    });
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
  global.SyswljkConfigService = { config: CONFIG, loadAll: loadAll, reloadDevices: reloadDevices, saveDeviceConfig: saveDeviceConfig, saveAll: saveAll };
})(window);
