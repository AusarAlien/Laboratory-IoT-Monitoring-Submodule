(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: true,
    defaultDbnm: "ynjk",
    qids: {
      projects: "18010q",
      objects: "18001q",
      requirements: "18020q",
      records: "18040q",
      alarms: "18070q",
      saveProject: "18011p",
      saveRequirement: "18021p",
      saveRecord: "18041p",
    },
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
  function loadAll() {
    if (CONFIG.mockMode) return Promise.resolve(global.SyswljkEnvMock.load());
    return Promise.reject(new Error("真实环境监测 SQL 尚未注册"));
  }
  function saveAll(v) {
    if (!CONFIG.mockMode)
      return Promise.reject(new Error("真实提交 SQL 尚未注册"));
    return Promise.resolve(global.SyswljkEnvMock.save(v));
  }
  global.SyswljkEnvService = {
    config: CONFIG,
    commonParams: common,
    loadAll: loadAll,
    saveAll: saveAll,
  };
})(window);
