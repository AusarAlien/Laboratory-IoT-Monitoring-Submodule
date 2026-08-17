# QUERYDATA 空结果与执行失败处理规范

## 1. 问题现象

平台注册 SQL 发生字段错误、参数错误、权限错误或数据库异常时，页面可能不显示错误，而是出现以下现象：

- 主列表显示 0 条；
- 顶部统计全部为 0；
- 图表为空；
- 用户误以为业务表没有数据。

已确认的实际案例是 `ynjksys_wljk_pz_sb01q` 查询发生：

```text
ORA-00904: "FINSTID": invalid identifier
```

但前端曾把平台返回的失败结果转换为 `[]`，所以页面只显示空列表。

## 2. 根因

当前平台 `isimpxls/views.py` 的查询入口使用结果集合本身判断：

```python
rtn, rtndesc, rslt, titles = execIsQuery(...)
if rslt:
    return JsonResponse({"title": ..., "data": rslt})
else:
    return JsonResponse({"success": "false", "message": "querydata报错"})
```

该判断把两种不同状态合并成同一个响应：

1. SQL 执行成功，但结果为 0 行；
2. SQL 执行失败，没有结果集。

前端收到 `success:false` 后无法再判断是哪一种情况。

## 3. 本模块固定处理规则

1. `success:false` 一律按查询失败处理，不得转换为空数组。
2. 只有 `success:true` 且 `data=[]` 才表示正常空结果。
3. 查询失败不得切换 Mock 数据。
4. 页面只显示统一、简洁的加载失败提示；查询号、错误码和服务端消息写入控制台及服务器日志。
5. 排查时以服务器 `ispys.log` 中同一查询号后出现的 Oracle 错误为准。

本模块统一使用：

```text
static/ynjksys/syswljk_common/syswljk_query_guard.js
```

所有真实查询页面必须先加载该脚本，再加载各页面的数据服务。

## 4. 平台接口目标契约

平台查询入口应依据 `execIsQuery` 的执行状态判断成功或失败，不能依据 `rslt` 是否为空判断。目标响应如下。

执行成功且有数据：

```json
{"success": true, "title": ["F1"], "data": [["value"]]}
```

执行成功但没有数据：

```json
{"success": true, "title": ["F1"], "data": []}
```

执行失败：

```json
{"success": false, "code": "QUERY_EXECUTION_FAILED", "message": "数据查询失败", "qid": "查询号"}
```

平台公共代码升级前，本模块宁可明确显示加载失败，也不能把无法判定的失败响应伪装成正常 0 条。

## 5. 标准排查步骤

1. 在浏览器网络请求中确认查询号和请求参数。
2. 检查响应是否包含 `success:false`。
3. 在 `ispys.log` 中按查询号定位同一时间的 Oracle 错误。
4. 在 PL/SQL 中使用同样的会话机构参数执行主体 SQL。
5. 依次核对字段名、CTE/UNION 输出别名、参数顺序、参数类型和机构过滤。
6. 修正注册 SQL 后重新执行，验证有数据、正常空结果和错误 SQL 三种场景。

## 6. 验收标准

- SQL 有数据：页面展示真实记录。
- SQL 正常 0 行：平台返回 `success:true/data:[]`，页面展示空状态。
- SQL 执行失败：页面提示加载失败，不能显示为正常 0 条。
- 查询失败：不得出现 Mock 数据。
- 控制台可定位查询号，服务器日志可定位原始数据库错误。
