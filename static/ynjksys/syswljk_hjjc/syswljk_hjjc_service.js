(function (global) {
  "use strict";
  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: {
      projects: "ynjksys_hjjc_wsd_bz01q",
      objects: "ynjksys_hjjc_wsd_sb01q",
      requirements: "ynjksys_hjjc_hjyq01q",
    },
  };
  function field(row, name) {
    var upper = name.toUpperCase(), key;
    if (!row) return "";
    if (row[upper] != null) return row[upper];
    if (row[name] != null) return row[name];
    for (key in row) if (Object.prototype.hasOwnProperty.call(row, key) && key.toUpperCase() === upper) return row[key];
    return "";
  }
  function rows(result) {
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
  function common() {
    var p = typeof global.buildCommonParams === "function" ? global.buildCommonParams() || {} : {};
    p.hp = p.hp || "ynjksys";
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm))) p.dbnm = CONFIG.defaultDbnm;
    return p;
  }
  function query(qid) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) {
        reject(new Error("数据服务暂不可用")); return;
      }
      global.isqrydata.query({
        qid: qid,
        data: common(),
        successCallback: function (result) {
          global.SyswljkQueryGuard.settle(result, { qid: qid, resolve: resolve, reject: reject, map: rows, message: "数据加载失败" });
        },
        errorCallback: reject,
      });
    });
  }
  function mapProject(r) {
    var code = String(field(r, "FMETRICCODE") || field(r, "FSTANDARDID") || "");
    return {
      id: code,
      sourceId: String(field(r, "FSTANDARDID") || ""),
      code: code,
      name: String(field(r, "FMETRICNAME") || code),
      itemType: String(field(r, "FITEMTYPE") || ""),
      unit: String(field(r, "FUNIT") || ""),
      lower: String(field(r, "FLOWERTEXT") || ""),
      upper: String(field(r, "FUPPERTEXT") || ""),
      defaultValue: String(field(r, "FDEFAULTVALUE") || ""),
      statusCode: String(field(r, "FSTATECODE") || ""),
      status: String(field(r, "FSTATECODE")) === "0" ? "停用" : "启用",
      order: Number(field(r, "FORDER")) || 0,
      description: String(field(r, "FREMARK") || ""),
    };
  }
  function mapObject(r) {
    return {
      id: String(field(r, "FDEVICEID") || ""),
      code: String(field(r, "FDEVICEIP") || ""),
      name: String(field(r, "FDEVICENAME") || ""),
      type: String(field(r, "FDEVICETYPE") || "环境监测对象"),
      department: String(field(r, "FDEPTNO") || "未设置"),
      location: String(field(r, "FLOCATION") || ""),
    };
  }
  function mapRequirement(r) {
    return {
      id: String(field(r, "FREQID") || ""),
      objectId: String(field(r, "FOBJECTID") || ""),
      projectId: String(field(r, "FPROJECTCODE") || ""),
      labId: String(field(r, "FLIBSEQ") || ""),
      labName: String(field(r, "FLIBNAME") || ""),
      department: String(field(r, "FDEPARTMENT") || "未设置"),
      lower: field(r, "FLOWER"),
      upper: field(r, "FUPPER"),
      unit: String(field(r, "FUNIT") || ""),
      status: String(field(r, "FSTATUS") || "未设置"),
      source: String(field(r, "FSOURCETABLE") || ""),
    };
  }
  function loadAll() {
    return Promise.all([query(CONFIG.qids.projects), query(CONFIG.qids.objects), query(CONFIG.qids.requirements)])
      .then(function (v) {
        return { projects: v[0].map(mapProject), objects: v[1].map(mapObject), requirements: v[2].map(mapRequirement) };
      });
  }
  /* 正式业务表的写入权限和维护边界尚未确认，本阶段仅固定真实查询映射。 */
  function saveAll() { return Promise.reject(new Error("当前页面为业务档案只读视图")); }
  global.SyswljkEnvService = { config: CONFIG, commonParams: common, loadAll: loadAll, saveAll: saveAll };
})(window);
