-- 门禁配置标签迁移：肇庆实验室 -> 云南中心实验室
-- 适用范围：HII.IB_TBS_LABAREA 中现有演示/历史配置。
-- 本脚本不会改变控制器 SN、人员、卡号和历史出入事件，也不会把历史数据变成真实云南门禁数据。
-- 建议在 PL/SQL Developer 中分段执行，每一步核对结果后再继续。

-- ============================================================================
-- 1. 执行前检查
-- ============================================================================

select column_name, data_type, data_length, char_length, char_used
  from all_tab_columns
 where owner = 'HII'
   and table_name = 'IB_TBS_LABAREA'
   and column_name in ('LABNAME', 'LABALIAS', 'AREA', 'AREAALIAS')
 order by column_id;

select trim(labname) labname,
       trim(area) area,
       count(*) config_count,
       count(distinct trim(sn)) controller_count
  from hii.ib_tbs_labarea
 group by trim(labname), trim(area)
 order by trim(labname), trim(area);

-- LABNAME 原定义为 VARCHAR2(20)。如果数据库使用 BYTE 语义，
-- “云南中心实验室”可能超过 20 字节。先扩为 40 个字符，避免 ORA-12899。
alter table hii.ib_tbs_labarea modify labname varchar2(40 char);

-- ============================================================================
-- 2. 备份本次将修改的行
-- ============================================================================
-- 该备份表名固定带日期，重复执行时如果表已存在会直接失败，防止覆盖第一次备份。

create table hii.ib_tbs_labarea_bak_yn20260817 as
select rowidtochar(l.rowid) fsource_rowid,
       l.*
  from hii.ib_tbs_labarea l
 where trim(l.labname) = '肇庆实验室';

select count(*) backup_count
  from hii.ib_tbs_labarea_bak_yn20260817;

-- ============================================================================
-- 3. 修改实验室名称
-- ============================================================================

savepoint before_labarea_rename;

update hii.ib_tbs_labarea l
   set l.labname = '云南中心实验室',
       l.labalias = case
         when trim(l.labalias) is null then '云南省疾病预防控制中心实验室'
         when instr(trim(l.labalias), '肇庆') > 0
           then replace(trim(l.labalias), '肇庆', '云南中心')
         else trim(l.labalias)
       end
 where trim(l.labname) = '肇庆实验室';

-- 核对影响行数；此时暂不提交。
select trim(labname) labname,
       trim(labalias) labalias,
       trim(area) area,
       trim(areaalias) areaalias,
       trim(sn) sn,
       trim(checktype) checktype
  from hii.ib_tbs_labarea
 where trim(l.labname) = '云南中心实验室'
 order by trim(sn), trim(checktype);

-- ============================================================================
-- 4. 可选：把原有通用区域名称调整为 yncdc 业务描述
-- ============================================================================
-- 只有在确认这些控制器确实属于对应区域后才执行本段。
-- 如果尚未确认每个 SN 的安装位置，建议保留原 AREA，不要按名称猜测设备归属。

/*
update hii.ib_tbs_labarea l
   set l.area = case trim(l.area)
         when '一/二级实验室区域' then '理化及毒理实验区'
         when 'PCR试验区' then 'PCR实验区'
         else trim(l.area)
       end,
       l.areaalias = case trim(l.area)
         when '一/二级实验室区域' then '理化检验、毒理检测实验区域'
         when 'PCR试验区' then '分子生物学PCR实验区域'
         else nvl(trim(l.areaalias), trim(l.area))
       end
 where trim(l.labname) = '云南中心实验室';
*/

-- 更推荐按控制器 SN 做一对一映射。将下面示例 SN 替换为现场确认值后执行。
/*
merge into hii.ib_tbs_labarea l
using (
  select '待填写-SN-01' sn, '理化实验区' area, '理化检验实验室' areaalias from dual
  union all
  select '待填写-SN-02', '毒理实验区', '毒理检测实验室' from dual
  union all
  select '待填写-SN-03', '微生物实验区', '微生物检验实验室' from dual
  union all
  select '待填写-SN-04', 'PCR实验区', '分子生物学PCR实验室' from dual
  union all
  select '待填写-SN-05', '样本管理区', '样本接收及保存区域' from dual
) m
on (trim(l.sn) = m.sn and trim(l.labname) = '云南中心实验室')
when matched then update
  set l.area = m.area,
      l.areaalias = m.areaalias;
*/

-- ============================================================================
-- 5. 提交前核对
-- ============================================================================

select trim(labname) labname,
       trim(area) area,
       count(*) config_count,
       count(distinct trim(sn)) controller_count
  from hii.ib_tbs_labarea
 where trim(labname) = '云南中心实验室'
 group by trim(labname), trim(area)
 order by trim(area);

select count(*) linked_event_count,
       min(t.checktime) earliest_event_time,
       max(t.checktime) latest_event_time
  from hii.ib_tbs_checkinout t
  join hii.ib_tbs_labarea l
    on trim(l.sn) = trim(t.sn)
 where trim(l.labname) = '云南中心实验室';

-- 确认结果正确后手工执行：
-- commit;

-- 结果不正确且尚未提交时执行：
-- rollback to before_labarea_rename;

-- ============================================================================
-- 6. 已提交后的回退脚本
-- ============================================================================
-- 保留备份表期间，可按原 ROWID 恢复本次修改的配置字段。
/*
merge into hii.ib_tbs_labarea l
using hii.ib_tbs_labarea_bak_yn20260817 b
on (rowidtochar(l.rowid) = b.fsource_rowid)
when matched then update
  set l.labname = b.labname,
      l.labalias = b.labalias,
      l.area = b.area,
      l.areaalias = b.areaalias;

commit;
*/

