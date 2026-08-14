(function(global){"use strict";var W=global.SyswljkWsdService;global.SyswljkQueryService={
  loadDevices:function(){return W.loadDevices();},
  loadRows:function(p){return W.loadRecords(p||{});},
  loadSummary:function(p){return W.loadSummary(p||{});},
  loadTrend:function(p){return W.loadTrend(p||{});}
};})(window);
