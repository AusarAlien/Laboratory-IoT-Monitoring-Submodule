(function (global) {
  "use strict";
  var CONFIG = { mockMode: true, defaultDbnm: "ynjk", qids: { systems: "14001q", mappings: "14002q", logs: "14003q", saveSystem: "14004p", saveMapping: "14005p" } };
  function common() {
    var p = typeof global.buildCommonParams === "function" ? global.buildCommonParams() || {} : {};
    p.hp = p.hp || "ynjksys";
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm))) p.dbnm = CONFIG.defaultDbnm;
    return p;
  }
  function rows(result) { return result && Array.isArray(result.data) ? result.data : []; }
  function query(qid) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) { reject(new Error("数据服务暂不可用")); return; }
      global.isqrydata.query({
        qid: qid,
        data: common(),
        successCallback: function (result) { global.SyswljkQueryGuard.settle(result, { qid: qid, resolve: resolve, reject: reject, map: rows, message: "外部接入数据加载失败" }); },
        errorCallback: reject,
      });
    });
  }
  function loadAll() {
    if (CONFIG.mockMode) return Promise.resolve(global.SyswljkExternalMock.load());
    return Promise.all([query(CONFIG.qids.systems), query(CONFIG.qids.mappings), query(CONFIG.qids.logs)]).then(function (v) { return { systems: v[0], mappings: v[1], logs: v[2] }; });
  }
  function saveAll(v) {
    if (!CONFIG.mockMode) return Promise.reject(new Error("保存功能暂不可用"));
    return Promise.resolve(global.SyswljkExternalMock.save(v));
  }
  global.SyswljkExternalService = { config: CONFIG, commonParams: common, loadAll: loadAll, saveAll: saveAll };
})(window);
