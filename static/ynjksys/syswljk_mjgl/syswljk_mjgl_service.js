(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: false,
    defaultDbnm: "ynjk",
    qids: {
      records: "ynjksys_mjgl_jl01q",
      summary: "ynjksys_mjgl_jl02q",
      areas: "ynjksys_mjgl_qy01q",
      people: "ynjksys_mjgl_ry01q",
      devices: "ynjksys_mjgl_sb01q",
    },
  };
  function rows(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0]))
      return result.data;
    if (
      global.isqrydata &&
      typeof global.isqrydata.convertDataToObject === "function"
    )
      return global.isqrydata.convertDataToObject(
        result.data,
        result.title || [],
      );
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, i) {
        item[title] = row[i];
      });
      return item;
    });
  }
  function common() {
    var p =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    if (!p.dbnm || /^(none|null|undefined)$/i.test(String(p.dbnm)))
      p.dbnm = CONFIG.defaultDbnm;
    p.hp = p.hp || "ynjksys";
    return p;
  }
  function query(qid, business) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("数据服务暂不可用"));
        return;
      }
      var p = common();
      Object.keys(business || {}).forEach(function (k) {
        p[k] = business[k];
      });
      global.isqrydata.query({
        qid: qid,
        data: p,
        successCallback: function (result) {
          resolve(rows(result));
        },
        errorCallback: reject,
      });
    });
  }
  /* Mock 降级调用保留（正式模式不执行）：
function mockLoad(name){return Promise.resolve(global.MjglMock.load()[name]||[]);}
如需离线演示，恢复模板中的 mock.js 引用、将 mockMode 改为 true，
并在以下方法中显式调用 mockLoad。生产环境禁止查询失败后静默回退模拟数据。
*/
  global.MjglService = {
    config: CONFIG,
    loadAreas: function () {
      return query(CONFIG.qids.areas, {});
    },
    loadDevices: function () {
      return query(CONFIG.qids.devices, {});
    },
    loadPeople: function (keyword) {
      return query(CONFIG.qids.people, {
        person_keyword_sql_equal: keyword || null,
      });
    },
    loadRecords: function (f) {
      return query(CONFIG.qids.records, {
        person_keyword_sql_equal: f.keyword || null,
        area_sql_equal: f.area || null,
        sn_sql_equal: f.sn || null,
        check_type_sql_equal: f.direction || null,
        verify_code_sql_equal: f.verifyCode || null,
        start_time_sql_equal: f.startTime || null,
        end_time_sql_equal: f.endTime || null,
        page_sql_equal: f.page || 1,
        page_size_sql_equal: f.pageSize || 20,
      });
    },
    loadSummary: function (f) {
      return query(CONFIG.qids.summary, {
        person_keyword_sql_equal: f.keyword || null,
        area_sql_equal: f.area || null,
        sn_sql_equal: f.sn || null,
        check_type_sql_equal: f.direction || null,
        verify_code_sql_equal: f.verifyCode || null,
        start_time_sql_equal: f.startTime || null,
        end_time_sql_equal: f.endTime || null,
      });
    },
  };
})(window);
