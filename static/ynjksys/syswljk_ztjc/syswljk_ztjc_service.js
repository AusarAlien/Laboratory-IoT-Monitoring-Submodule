(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: true,
    defaultDbnm: "ynjk",
    qids: { realtime: "15001q", history: "15002q", mappings: "15003q" },
  };
  function common() {
    var p =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    p.hp = p.hp || "ynjksys";
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm)))
      p.dbnm = CONFIG.defaultDbnm;
    return p;
  }
  function query(qid) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件未加载"));
        return;
      }
      global.isqrydata.query({
        qid: qid,
        data: common(),
        successCallback: function (r) {
          resolve(r && r.data ? r.data : []);
        },
        errorCallback: reject,
      });
    });
  }
  function source(k, q) {
    return CONFIG.mockMode
      ? Promise.resolve(JSON.parse(JSON.stringify(global.SyswljkStatusMock[k])))
      : query(q);
  }
  global.SyswljkStatusService = {
    config: CONFIG,
    commonParams: common,
    getReferenceTime: function () {
      return CONFIG.mockMode
        ? global.SyswljkStatusMock.referenceTime
        : new Date().toISOString().slice(0, 19).replace("T", " ");
    },
    loadRealtime: function () {
      return source("devices", CONFIG.qids.realtime);
    },
    loadHistory: function () {
      return source("history", CONFIG.qids.history);
    },
    loadMappings: function () {
      return source("mappings", CONFIG.qids.mappings);
    },
  };
})(window);
