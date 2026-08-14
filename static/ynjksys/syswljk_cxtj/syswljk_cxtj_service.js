(function (global) {
  "use strict";
  var W = global.SyswljkWsdService,
    E = global.SyswljkEnergyService,
    ENERGY = {
      CURRENT: 1,
      VOLTAGE: 1,
      POWER: 1,
      ENERGY: 1,
      DURATION: 1,
      POWER_FACTOR: 1,
    };
  function source(p) {
    return p && ((p.type || "") === "设备能耗监测设备" || ENERGY[p.metric])
      ? E
      : W;
  }
  function merge(a, b) {
    return Promise.all([a, b]).then(function (v) {
      return v[0].concat(v[1]);
    });
  }
  global.SyswljkQueryService = {
    loadDevices: function () {
      return merge(W.loadDevices(), E.loadDevices());
    },
    loadRows: function (p) {
      return source(p).loadRecords(p || {});
    },
    loadSummary: function (p) {
      return source(p).loadSummary(p || {});
    },
    loadTrend: function (p) {
      return source(p).loadTrend(p || {});
    },
  };
})(window);
