(function (global) {
  "use strict";

  function isFailure(result) {
    return !!(result && String(result.success).toLowerCase() === "false");
  }

  function createError(result, qid, publicMessage) {
    var error = new Error(publicMessage || "数据加载失败，请稍后重试");
    error.code = "QUERY_EXECUTION_FAILED";
    error.queryId = qid || "";
    error.serverMessage = result && result.message ? String(result.message) : "";
    return error;
  }

  function settle(result, options) {
    options = options || {};
    if (isFailure(result)) {
      var error = createError(result, options.qid, options.message);
      if (global.console && typeof global.console.error === "function") {
        global.console.error("查询执行失败", {
          qid: error.queryId,
          code: error.code,
          serverMessage: error.serverMessage,
        });
      }
      options.reject(error);
      return;
    }
    try {
      options.resolve(options.map ? options.map(result) : result);
    } catch (error) {
      options.reject(error);
    }
  }

  global.SyswljkQueryGuard = {
    isFailure: isFailure,
    createError: createError,
    settle: settle,
  };
})(window);
