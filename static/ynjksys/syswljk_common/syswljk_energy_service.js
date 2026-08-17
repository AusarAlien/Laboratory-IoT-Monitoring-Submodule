(function (global) {
  "use strict";
  var CONFIG = {
    defaultDbnm: "ynjk",
    qids: {
      devices: "ynjksys_wljk_nh_sb01q",
      records: "ynjksys_wljk_nh_jl01q",
      summary: "ynjksys_wljk_nh_hz01q",
      trend: "ynjksys_wljk_nh_qs01q",
      realtime: "ynjksys_wljk_nh_zt01q",
      history: "ynjksys_wljk_nh_bd01q",
    },
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
    if (global.isqrydata && typeof global.isqrydata.convertDataToObject === "function") return global.isqrydata.convertDataToObject(result.data, result.title || []);
    return result.data.map(function (row) { var item = {}; (result.title || []).forEach(function (title, i) { item[title] = row[i]; }); return item; });
  }
  function field(row, name) {
    var upper = name.toUpperCase(), key;
    if (!row) return "";
    if (row[upper] != null) return row[upper];
    if (row[name] != null) return row[name];
    for (key in row) if (Object.prototype.hasOwnProperty.call(row, key) && key.toUpperCase() === upper) return row[key];
    return "";
  }
  function num(v) { return v === "" || v == null ? null : Number(v); }
  function query(qid, business) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function" || !global.SyswljkQueryGuard) { reject(new Error("数据服务暂不可用")); return; }
      var p = common(); Object.keys(business || {}).forEach(function (k) { p[k] = business[k]; });
      global.isqrydata.query({qid:qid,data:p,successCallback:function(result){global.SyswljkQueryGuard.settle(result,{qid:qid,resolve:resolve,reject:reject,map:objectRows,message:"数据加载失败"});},errorCallback:reject});
    });
  }
  function params(f) {
    f=f||{}; return {start_time_sql_equal:f.startTime||null,end_time_sql_equal:f.endTime||null,device_sql_equal:f.device||null,dept_no_sql_equal:f.dept||null,metric_sql_equal:f.metric||null,status_sql_equal:f.status||null};
  }
  function mapDevice(r) {
    var instrumentId = String(field(r,"FINSTID")||"");
    return {id:instrumentId,ip:instrumentId,code:String(field(r,"FDEVICECODE")||instrumentId),name:String(field(r,"FINSTNAME")||("设备 "+instrumentId)),model:String(field(r,"FINSTMODEL")||"未设置"),dept:String(field(r,"FDEPTNO")||"未设置"),area:String(field(r,"FDEPTNO")||"未设置"),location:String(field(r,"FLOCATION")||"未设置"),type:"设备能耗监测设备",socket:String(field(r,"FSSID")||"")};
  }
  function mapRecord(r) {
    var instrumentId = String(field(r,"FINSTID")||"");
    return {rowNo:num(field(r,"FROWSEQ")),id:String(field(r,"FRECORDID")||""),sourceId:String(field(r,"FID")||""),deviceId:instrumentId,deviceIp:instrumentId,deviceCode:String(field(r,"FDEVICECODE")||instrumentId),deviceName:String(field(r,"FINSTNAME")||("设备 "+instrumentId)),deviceModel:String(field(r,"FINSTMODEL")||"未设置"),dept:String(field(r,"FDEPTNO")||"未设置"),location:String(field(r,"FLOCATION")||"未设置"),deviceType:"设备能耗监测设备",metricCode:String(field(r,"FMETRICCODE")||""),metricName:String(field(r,"FMETRICNAME")||""),value:num(field(r,"FVALUE")),unit:String(field(r,"FUNIT")||""),lower:null,upper:null,status:String(field(r,"FDATASTATUS")||"无效"),alarm:String(field(r,"FALARMDESC")||""),time:String(field(r,"FMONITORTIME")||""),socket:String(field(r,"FSSID")||""),raw:String(field(r,"FRAWDATA")||""),total:num(field(r,"FTOTALCOUNT"))||0};
  }
  function mapSummary(r) { return {total:num(field(r,"FRECORDCOUNT"))||0,devices:num(field(r,"FDEVICECOUNT"))||0,metrics:num(field(r,"FMETRICCOUNT"))||0,normal:num(field(r,"FNORMALCOUNT"))||0,alarm:num(field(r,"FALARMCOUNT"))||0,invalid:num(field(r,"FINVALIDCOUNT"))||0,today:num(field(r,"FTODAYCOUNT"))||0}; }
  function mapRealtime(r) {
    var instrumentId=String(field(r,"FINSTID")||"");
    return {id:String(field(r,"FDEVICEID")||""),instrumentId:instrumentId,code:String(field(r,"FDEVICECODE")||instrumentId),name:String(field(r,"FINSTNAME")||("设备 "+instrumentId)),model:String(field(r,"FINSTMODEL")||"未设置"),type:"设备能耗监测设备",area:String(field(r,"FDEPTNO")||"未设置"),location:String(field(r,"FLOCATION")||"未设置"),socket:String(field(r,"FSSID")||""),status:String(field(r,"FUNIFIEDSTATUS")||"未知"),rawCode:String(field(r,"FRAWSTATUS")||""),rawName:String(field(r,"FRAWSTATUSNAME")||"未知"),description:String(field(r,"FSTATUSDESC")||""),lastTime:String(field(r,"FLASTTIME")||""),timeout:num(field(r,"FTIMEOUT"))||180,duration:String(field(r,"FDURATION")||"--"),current:num(field(r,"FCURRENT")),voltage:num(field(r,"FVOLTAGE")),power:num(field(r,"FPOWERKW")),energy:num(field(r,"FTTLENERGY")),useHours:num(field(r,"FTTLUSETIMER")),message:String(field(r,"FMSG")||""),flag:String(field(r,"FFLAG")||"")};
  }
  function mapHistory(r) { return {id:String(field(r,"FRECORDID")||""),deviceId:String(field(r,"FDEVICEID")||""),time:String(field(r,"FCHANGETIME")||""),before:String(field(r,"FBEFORESTATUS")||"未知"),after:String(field(r,"FAFTERSTATUS")||"未知"),raw:String(field(r,"FRAWSTATUS")||""),reason:String(field(r,"FREASON")||"")}; }
  var mappings=[
    {id:"ENERGY-1",type:"设备能耗监测设备",rawCode:"1",rawName:"正常",status:"正常",priority:10,description:"设备上报状态码1"},
    {id:"ENERGY-2",type:"设备能耗监测设备",rawCode:"2",rawName:"异常",status:"异常",priority:10,description:"设备上报状态码2"},
    {id:"ENERGY-3",type:"设备能耗监测设备",rawCode:"3",rawName:"关机",status:"关机",priority:10,description:"设备上报状态码3"},
    {id:"ENERGY-4",type:"设备能耗监测设备",rawCode:"4",rawName:"待机",status:"正常",priority:20,description:"待机状态归入正常运行"},
    {id:"ENERGY-OFFLINE",type:"设备能耗监测设备",rawCode:"TIMEOUT",rawName:"通信超时",status:"离线",priority:1,description:"最后监测时间超过离线阈值"},
    {id:"ENERGY-UNKNOWN",type:"设备能耗监测设备",rawCode:"NULL",rawName:"未上报状态",status:"未知",priority:30,description:"设备状态字段为空"}
  ];
  /* Mock 数据仅作为历史降级方案保留，不参与当前运行，也不会在查询失败时自动启用。 */
  global.SyswljkEnergyService={config:CONFIG,loadDevices:function(){return query(CONFIG.qids.devices,{}).then(function(v){return v.map(mapDevice);});},loadRecords:function(f){var p=params(f);p.page_sql_equal=(f&&f.page)||1;p.page_size_sql_equal=(f&&f.pageSize)||20;return query(CONFIG.qids.records,p).then(function(v){return v.map(mapRecord);});},loadSummary:function(f){return query(CONFIG.qids.summary,params(f)).then(function(v){return mapSummary(v[0]||{});});},loadTrend:function(f){return query(CONFIG.qids.trend,params(f)).then(function(v){return v.map(mapRecord);});},loadRealtime:function(){return query(CONFIG.qids.realtime,{}).then(function(v){return v.map(mapRealtime);});},loadHistory:function(){return query(CONFIG.qids.history,{}).then(function(v){return v.map(mapHistory);});},loadMappings:function(){return Promise.resolve(mappings.slice());}};
})(window);
