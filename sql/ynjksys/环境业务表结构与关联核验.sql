-- 只读核验脚本：用于确认环境业务五张表的字段、约束和数据规模。
-- 在字段关系确认前，不直接改写现有平台注册查询。

select owner,
       table_name,
       column_id,
       column_name,
       data_type,
       data_length,
       data_precision,
       data_scale,
       nullable
  from all_tab_columns
 where owner = 'HTLIS'
   and table_name in (
       'LIS_LIBDEF',
       'LP_TBC_INSTFILE',
       'LP_TBC_CIRCUDEFM',
       'LIS_MCIRCSLOG',
       'LIS_DCIRCSLOG'
   )
 order by table_name, column_id;

select c.owner,
       c.table_name,
       c.constraint_name,
       c.constraint_type,
       cc.position,
       cc.column_name,
       c.r_owner,
       c.r_constraint_name
  from all_constraints c
  join all_cons_columns cc
    on cc.owner = c.owner
   and cc.constraint_name = c.constraint_name
   and cc.table_name = c.table_name
 where c.owner = 'HTLIS'
   and c.table_name in (
       'LIS_LIBDEF',
       'LP_TBC_INSTFILE',
       'LP_TBC_CIRCUDEFM',
       'LIS_MCIRCSLOG',
       'LIS_DCIRCSLOG'
   )
 order by c.table_name, c.constraint_name, cc.position;

select table_name, num_rows, last_analyzed
  from all_tables
 where owner = 'HTLIS'
   and table_name in (
       'LIS_LIBDEF',
       'LP_TBC_INSTFILE',
       'LP_TBC_CIRCUDEFM',
       'LIS_MCIRCSLOG',
       'LIS_DCIRCSLOG'
   )
 order by table_name;

-- 以下结果用于发现五张表之间名称相同的候选关联列。
-- 同名只代表候选关系，必须继续通过数据类型、非空率和关联基数验证。
select column_name,
       listagg(table_name, '；') within group (order by table_name) tables_using_column
  from all_tab_columns
 where owner = 'HTLIS'
   and table_name in (
       'LIS_LIBDEF',
       'LP_TBC_INSTFILE',
       'LP_TBC_CIRCUDEFM',
       'LIS_MCIRCSLOG',
       'LIS_DCIRCSLOG'
   )
 group by column_name
having count(distinct table_name) > 1
 order by column_name;

select 'LIS_LIBDEF' table_name, count(*) row_count from htlis.lis_libdef
union all
select 'LP_TBC_INSTFILE', count(*) from htlis.lp_tbc_instfile
union all
select 'LP_TBC_CIRCUDEFM', count(*) from htlis.lp_tbc_circudefm
union all
select 'LIS_MCIRCSLOG', count(*) from htlis.lis_mcircslog
union all
select 'LIS_DCIRCSLOG', count(*) from htlis.lis_dcircslog;

-- 业务代码值域：用于确认 IFOK、FTYPE、FMODE、ITEMTYPE、FIFVALID 的真实含义。
select trim(ftype) ftype, trim(fmode) fmode, trim(ifok) ifok, count(*) row_count
  from htlis.lis_mcircslog
 group by trim(ftype), trim(fmode), trim(ifok)
 order by trim(ftype), trim(fmode), trim(ifok);

select trim(ifok) ifok, count(*) row_count
  from htlis.lis_dcircslog
 group by trim(ifok)
 order by trim(ifok);

select trim(itemtype) itemtype, trim(fifvalid) fifvalid, count(*) row_count
  from htlis.lp_tbc_circudefm
 group by trim(itemtype), trim(fifvalid)
 order by trim(itemtype), trim(fifvalid);

-- 逻辑外键完整性。结果为 0 才表示当前数据不存在对应孤儿关系。
select 'MCIRCSLOG_MISSING_LIBDEF' check_name, count(*) invalid_count
  from htlis.lis_mcircslog m
 where m.libseq is not null
   and not exists (
       select 1 from htlis.lis_libdef l
        where trim(l.libseq) = trim(m.libseq)
   )
union all
select 'MCIRCSLOG_MISSING_INSTFILE', count(*)
  from htlis.lis_mcircslog m
 where m.instid is not null
   and not exists (
       select 1 from htlis.lp_tbc_instfile i
        where i.instid = m.instid
   )
union all
select 'DCIRCSLOG_MISSING_MASTER', count(*)
  from htlis.lis_dcircslog d
 where not exists (
       select 1 from htlis.lis_mcircslog m
        where m.circslogseq = d.circslogseq
   )
union all
select 'DCIRCSLOG_MISSING_ITEMDEF', count(*)
  from htlis.lis_dcircslog d
 where not exists (
       select 1 from htlis.lp_tbc_circudefm c
        where c.circuitemid = d.circuitemid
   );

-- 核对主记录的对象构成，防止把实验室记录与仪器记录重复统计。
select case
         when instid is not null and libseq is not null then 'INSTRUMENT_WITH_LAB'
         when instid is not null then 'INSTRUMENT_ONLY'
         when libseq is not null then 'LAB_ONLY'
         else 'NO_OBJECT'
       end object_kind,
       count(*) row_count
  from htlis.lis_mcircslog
 group by case
            when instid is not null and libseq is not null then 'INSTRUMENT_WITH_LAB'
            when instid is not null then 'INSTRUMENT_ONLY'
            when libseq is not null then 'LAB_ONLY'
            else 'NO_OBJECT'
          end
 order by object_kind;

-- 最近主细记录样例，用于确定页面字段、状态和记录方式映射。
select *
  from (
    select m.circslogseq,
           m.testtime,
           m.libseq,
           l.libname,
           m.instid,
           i.instno,
           i.instnm,
           m.ftype,
           m.fmode,
           m.ifok master_ifok,
           d.circuitemid,
           nvl(trim(d.itemname), trim(c.itemname)) itemname,
           d.itemvalue,
           nvl(trim(d.measureword), trim(c.measureword)) measureword,
           d.ifok detail_ifok,
           c.okvalue1,
           c.okvalue2
      from htlis.lis_mcircslog m
      join htlis.lis_dcircslog d
        on d.circslogseq = m.circslogseq
      left join htlis.lis_libdef l
        on trim(l.libseq) = trim(m.libseq)
      left join htlis.lp_tbc_instfile i
        on i.instid = m.instid
      left join htlis.lp_tbc_circudefm c
        on c.circuitemid = d.circuitemid
     order by m.testtime desc nulls last, m.circslogseq desc, d.circuitemid
  )
 where rownum <= 30;

-- 明细为空时仍需单独查看主记录，确认它们的时间范围和遗留对象标识。
select *
  from (
    select m.circslogseq,
           m.testtime,
           m.libseq,
           case when l.libseq is null then '0' else '1' end lib_matched,
           m.instid,
           case when i.instid is null then '0' else '1' end inst_matched,
           m.ftype,
           m.fmode,
           m.ifok,
           m.testman,
           m.recordman,
           m.ftestempid
      from htlis.lis_mcircslog m
      left join htlis.lis_libdef l
        on trim(l.libseq) = trim(m.libseq)
      left join htlis.lp_tbc_instfile i
        on i.instid = m.instid
     order by m.testtime desc nulls last, m.circslogseq desc
  )
 where rownum <= 30;

select min(testtime) min_testtime,
       max(testtime) max_testtime,
       count(distinct trim(libseq)) lib_count,
       count(distinct instid) inst_count
  from htlis.lis_mcircslog;

-- 项目定义真实内容及实验室结构化环境条件覆盖率。
select circuitemid,
       trim(itemcode) itemcode,
       trim(itemname) itemname,
       trim(itemtype) itemtype,
       trim(itemvalue) itemvalue,
       trim(measureword) measureword,
       trim(okvalue1) okvalue1,
       trim(okvalue2) okvalue2,
       trim(valuedef) valuedef,
       trim(fifvalid) fifvalid,
       forder,
       trim(remark) remark
  from htlis.lp_tbc_circudefm
 order by forder nulls last, circuitemid;

select count(*) lab_count,
       sum(case when fifmonitor is not null then 1 else 0 end) monitor_flag_count,
       sum(case when flowtemper is not null or ftoptemper is not null then 1 else 0 end) temperature_rule_count,
       sum(case when flowhumidity is not null or ftophumidity is not null then 1 else 0 end) humidity_rule_count,
       sum(case when flowpressure is not null or ftoppressure is not null then 1 else 0 end) pressure_rule_count
  from htlis.lis_libdef
 where nvl(trim(dfdel), '0') <> '1';
