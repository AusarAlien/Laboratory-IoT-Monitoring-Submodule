(function(global){"use strict";
var W=global.SyswljkWsdService,E=global.SyswljkEnergyService;
function clone(v){return JSON.parse(JSON.stringify(v));}
function merge(a,b){return Promise.all([a,b]).then(function(v){return v[0].concat(v[1]);});}
function result(r){return{id:r.id,deviceId:r.deviceId,time:r.time,metric:r.metricName,value:r.value,unit:r.unit,quality:r.status,batch:"--",raw:r.raw||r.remark||"--"};}
/* Mock 降级方案保留在 syswljk_sjcj_mock.js，但当前模板不加载，查询失败也不会自动切换。 */
global.SyswljkCollectionService={
  config:{mockMode:false,retentionDays:90,defaultDbnm:"ynjk"},
  loadDevices:function(){return merge(W.loadDevices(),E.loadDevices());},
  loadResults:function(){return merge(W.loadRecords({page:1,pageSize:10000}),E.loadRecords({page:1,pageSize:10000})).then(function(v){return v.map(result);});},
  loadLogs:function(){return Promise.resolve([]);},
  mockFallback:function(){return global.SyswljkCollectionMock?clone(global.SyswljkCollectionMock):null;}
};
})(window);
