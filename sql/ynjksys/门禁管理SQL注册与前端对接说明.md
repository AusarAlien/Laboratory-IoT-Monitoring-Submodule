# 门禁管理 SQL 注册与前端对接说明

## 查询号规则

完整注册 ID 使用 `ynjksys_mjgl_<业务缩写><序号>q`：

| 查询号 | 用途 | 数据来源 |
|---|---|---|
| `ynjksys_mjgl_jl01q` | 门禁出入记录分页查询 | `IB_TBS_CHECKINOUT`、`IB_TBS_USERINFO`、`IB_TBS_LABAREA` |
| `ynjksys_mjgl_jl02q` | 门禁记录汇总统计 | 同上 |
| `ynjksys_mjgl_qy01q` | 门禁区域选项 | `IB_TBS_LABAREA` |
| `ynjksys_mjgl_ry01q` | 门禁人员选项 | `IB_TBS_USERINFO` |
| `ynjksys_mjgl_sb01q` | 门禁设备选项 | `IB_TBS_LABAREA`、`IB_TBS_CHECKINOUT` |

前端调用时通常传去掉系统前缀后的查询号，例如 `mjgl_jl01q`；以当前平台 `isqrydata.query()` 的实际规则为准。

## 门禁记录参数

`mjgl_jl01q` 与 `mjgl_jl02q` 使用相同业务参数：

| 参数 | 类型 | 含义 |
|---|---|---|
| `person_keyword` | V | 姓名、人员编号或卡号模糊查询 |
| `area` | V | `LABAREA.AREA` 原值 |
| `sn` | V | 门禁设备序列号 |
| `check_type` | V | 页面传“进入”或“离开” |
| `verify_code` | N | 验证方式代码，目前仅确认 `15=人脸识别` |
| `start_time` | V | `yyyy-MM-dd HH:mm:ss` |
| `end_time` | V | `yyyy-MM-dd HH:mm:ss` |
| `page` | N | 页码，仅 `jl01q` 使用 |
| `page_size` | N | 每页条数，仅 `jl01q` 使用 |

## 前端字段映射

| 查询字段 | 页面字段 |
|---|---|
| `FROWSEQ` | 序号 |
| `FUSERID` / `FBADGENUMBER` | 用户 ID / 人员编号 |
| `FNAME` | 人员姓名 |
| `FCARDNO` | 卡号 |
| `FLABNAME` / `FAREA` | 实验室 / 所属区域 |
| `FSN` | 门禁设备序列号 |
| `FSENSORID` | 门点或传感器编号 |
| `FCHECKTYPE` | 进入/离开 |
| `FCHECKTIME` | 发生时间 |
| `FVERIFYCODE` / `FCODETYPE` | 验证代码 / 验证方式 |
| `FMASKFLAG` / `FTEMPERATURE` | 口罩标记 / 体温 |
| `FMEMOINFO` | 设备备注信息 |
| `FTOTALCOUNT` | 查询总数 |

## 已采取的数据约束

- 进出方向以事件表 `IB_TBS_CHECKINOUT.CHECKTYPE` 为准。
- 区域关联优先使用 `SN + CHECKTYPE`；找不到时回退到同一 `SN` 的一条区域配置。
- `IB_TBS_LABAREA` 没有唯一约束，查询通过 `ROW_NUMBER()` 去重，避免区域配置重复导致事件重复。
- 人员表使用左连接，历史事件找不到人员档案时仍保留事件。
- 不查询 `PASSWORD`、`MVERIFYPASS`、身份证号码等敏感字段。
- 未知 `VERIFYCODE` 显示为 `其他方式(<代码>)`，不猜测刷卡或密码类型。

## 当前不能真实对接的功能

现有三张表只能证明人员档案、区域配置和门禁事件数据，不能可靠支持以下写操作：

- 门控器属性保存与配置下发；
- 人员门禁权限新增、修改、启停与下发；
- 超级密码或胁迫密码配置；
- 报警确认、处置记录；
- 设备在线/离线实时状态。

这些功能需要对应的权限表、控制器配置表、设备心跳表、报警处置表或厂商接口后再编写提交 SQL，不能直接写入当前三张表。

## 注册前数据库检查

```sql
select sn, checktype, count(*)
  from ib_tbs_labarea
 group by sn, checktype
having count(*) > 1;

select verifycode, count(*)
  from ib_tbs_checkinout
 group by verifycode
 order by verifycode;

select checktype, count(*)
  from ib_tbs_checkinout
 group by checktype
 order by checktype;
```

先在 PL/SQL 中运行上述检查，再依次执行五个注册脚本。

## 前端接入状态

- `syswljk_mjgl_list.html` 已加载 `isvar.js`、`isqrydata.js` 和 `syswljk_mjgl_service.js`。
- `syswljk_mjgl_service.js` 的 `mockMode` 固定为 `false`，使用上述五个完整查询 ID。
- `syswljk_mjgl_mock.js` 已整段注释保留，正式模板不加载该文件，查询失败时不会静默回退模拟数据。
- 页面已按真实表能力收敛为：最新记录、门禁设备、门禁人员、门禁记录。
- 查询 SQL 尚需在目标 YNJK 平台数据库中执行注册；未注册前页面会明确显示真实查询失败。
