(function(global){
  "use strict";
  var CONFIG={mockMode:true,retentionDays:90,defaultDbnm:"ynjk",qids:{devices:"13001q",results:"13002q",logs:"13003q",summary:"13004q"}};
  function commonParams(){var p=typeof global.buildCommonParams==="function"?(global.buildCommonParams()||{}):{};p.hp=p.hp||"ynjksys";if(!p.dbnm||/^(none|null|undefined)$/i.test(String(p.dbnm)))p.dbnm=CONFIG.defaultDbnm;return p;}
  function rows(result){if(!result||!Array.isArray(result.data))return[];if(!result.data.length||!Array.isArray(result.data[0]))return result.data;if(global.isqrydata&&typeof global.isqrydata.convertDataToObject==="function")return global.isqrydata.convertDataToObject(result.data,result.title||[]);return result.data.map(function(row){var item={};(result.title||[]).forEach(function(title,i){item[title]=row[i];});return item;});}
  function query(qid,business){return new Promise(function(resolve,reject){if(!qid){reject(new Error("平台查询号尚未注册"));return;}if(!global.isqrydata||typeof global.isqrydata.query!=="function"){reject(new Error("平台查询组件未加载"));return;}var p=commonParams();Object.keys(business||{}).forEach(function(k){p[k]=business[k];});global.isqrydata.query({qid:qid,data:p,successCallback:function(result){resolve(rows(result));},errorCallback:reject});});}
  function source(name,qid,params){return CONFIG.mockMode?Promise.resolve(JSON.parse(JSON.stringify(global.SyswljkCollectionMock[name]))):query(qid,params);}
  global.SyswljkCollectionService={config:CONFIG,commonParams:commonParams,loadDevices:function(p){return source("devices",CONFIG.qids.devices,p);},loadResults:function(p){return source("results",CONFIG.qids.results,p);},loadLogs:function(p){return source("logs",CONFIG.qids.logs,p);}};
})(window);
