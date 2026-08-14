(function(global){"use strict";
var E=global.SyswljkEnergyService;
/* Mock 降级代码保留在 syswljk_ztjc_mock.js，当前页面不加载，也不在真实查询失败时自动启用。 */
global.SyswljkStatusService={
  config:{mockMode:false,defaultDbnm:"ynjk"},
  getReferenceTime:function(){var d=new Date(),p=function(v){return String(v).padStart(2,"0");};return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())+" "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());},
  loadRealtime:function(){return E.loadRealtime();},
  loadHistory:function(){return E.loadHistory();},
  loadMappings:function(){return E.loadMappings();}
};
})(window);
