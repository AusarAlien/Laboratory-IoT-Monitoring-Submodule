(function(global){
  "use strict";
  var CONFIG={mockMode:true,qids:{types:"12001q",devices:"12002q",areas:"12003q",accounts:"12004q",saveType:"12005p",saveDevice:"12006p",saveArea:"12007p",saveAccount:"12008p"}};
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function query(qid,params){return new Promise(function(resolve,reject){if(!global.isqrydata||typeof global.isqrydata.query!=="function"){reject(new Error("平台查询组件未加载"));return;}global.isqrydata.query(qid,params||{},function(data){resolve(data||[]);},function(error){reject(error||new Error("查询失败"));});});}
  function loadAll(){if(CONFIG.mockMode)return Promise.resolve(global.SyswljkConfigMock.load());return Promise.all([query(CONFIG.qids.types),query(CONFIG.qids.devices),query(CONFIG.qids.areas),query(CONFIG.qids.accounts)]).then(function(rows){return{types:rows[0],devices:rows[1],areas:rows[2],accounts:rows[3]};});}
  function saveAll(data){if(!CONFIG.mockMode)return Promise.reject(new Error("真实提交 SQL 尚未注册"));return Promise.resolve(global.SyswljkConfigMock.save(clone(data)));}
  global.SyswljkConfigService={config:CONFIG,loadAll:loadAll,saveAll:saveAll};
})(window);
