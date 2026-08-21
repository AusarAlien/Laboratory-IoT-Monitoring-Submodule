declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_pz_sb01q'; name := '物联配置设备列表查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~with energy_ranked as (
  select trim(d.instid) instid,
         trim(d.fssid) fssid,
         d.fappmonitordt,
         trim(d.fstatus) fstatus,
         row_number() over(
           partition by trim(d.instid)
           order by d.fappmonitordt desc nulls last, d.rowid desc
         ) rn
    from hii.ib_tbs_devicemonitorlog d
   where trim(d.instid) is not null
     and (nvl(?, 0) = 0 or d.fhiino = ?)
), energy_latest as (
  select instid, fssid, fappmonitordt, fstatus
    from energy_ranked
   where rn = 1
), inst as (
  select to_char(lp.instid) instid,
         trim(lp.instno) instno,
         trim(lp.instnm) instnm,
         trim(lp.instxh) instxh,
         trim(lp.status) archivestatus,
         trim(lp.loaction) loaction,
         trim(lp.place) place,
         trim(lp.fusedptno) deptno,
         to_char(lp.fhiino) fhiino,
         lp.fopdt
    from htlis.lp_tbc_instfile lp
   where nvl(trim(lp.fifmonitor), '1') = '1'
     and (nvl(?, 0) = 0 or lp.fhiino = ?)
), temp_latest as (
  select trim(t.htdeviceip) fdeviceip,
         max(t.fopdt) flasttime
    from htlis.lis_chgsampdepot_reqcircu t
   where trim(t.htdeviceip) is not null
   group by trim(t.htdeviceip)
), device_config as (
  select c.fguid,
         trim(c.fdevicekey) fdevicekey,
         trim(c.farea) farea,
         trim(c.fendpoint) fendpoint,
         trim(c.fip) fip,
         trim(c.fport) fport,
         c.facqperiod,
         trim(c.fwarn) fwarn,
         trim(c.fstatus) fstatus,
         trim(c.fremark) fremark,
         c.fopdt
    from hii.ib_tbs_iotdevicecfg c
   where c.fdeleted = '0'
     and c.fhiino = nvl(?, 0)
), unified as (
  select 'INST:' || i.instid fdevicekey,
         nvl(i.instno, i.instid) fdevicecode,
         nvl(i.instnm, '仪器 ' || i.instid) fdevicename,
         case when e.instid is not null then '设备能耗监测设备' else '仪器设备档案' end fdevicetype,
         case when e.instid is not null then 'ENERGY' else 'INSTRUMENT' end fdevicetypecode,
         nvl(i.loaction, nvl(i.place, nvl(i.deptno, '未设置'))) farea,
         e.fssid fendpoint,
         case when e.fssid is not null then '智能插座 ' || e.fssid else null end fconnection,
         nvl(i.archivestatus, '未设置') farchivestatus,
         case e.fstatus
           when '1' then '正常'
           when '2' then '异常'
           when '3' then '关机'
           when '4' then '待机'
           else '--'
         end frunstatus,
         '仪器设备档案' fdatasource,
         to_char(e.fappmonitordt, 'yyyy-mm-dd hh24:mi:ss') flastdatatime,
         i.fhiino,
         case when e.fssid is not null then 1 else 0 end fconnected,
         i.instid finstid,
         e.fssid,
         cast(null as varchar2(300)) fdeviceip,
         '型号：' || nvl(i.instxh, '未设置') fdetail
    from inst i
    left join energy_latest e on e.instid = i.instid

  union all

  select 'ENERGY:' || e.instid,
         e.instid,
         '设备 ' || e.instid,
         '设备能耗监测设备',
         'ENERGY',
         '未设置',
         e.fssid,
         case when e.fssid is not null then '智能插座 ' || e.fssid else null end,
         '未关联档案',
         case e.fstatus
           when '1' then '正常'
           when '2' then '异常'
           when '3' then '关机'
           when '4' then '待机'
           else nvl(e.fstatus, '未设置')
         end,
         '能耗历史记录',
         to_char(e.fappmonitordt, 'yyyy-mm-dd hh24:mi:ss'),
         null,
         1,
         e.instid,
         e.fssid,
         cast(null as varchar2(300)),
         '未关联仪器档案'
    from energy_latest e
   where not exists (select 1 from inst i where i.instid = e.instid)

  union all

  select 'ENV:' || nvl(trim(p.fid), to_char(p.depotseq) || ':' || trim(p.fdeviceip)),
         nvl(trim(p.fid), to_char(p.depotseq)),
         nvl(trim(p.fname), trim(p.fdesc)),
         '环境监测设备',
         'ENVIRONMENT',
         nvl(trim(p.fdptno), nvl(trim(p.fname), '未设置')),
         trim(p.fdeviceip),
         trim(p.fdeviceip),
         '已登记',
         '--',
         '环境设备档案',
         to_char(t.flasttime, 'yyyy-mm-dd hh24:mi:ss'),
         trim(p.fhiino),
         1,
         null,
         null,
         trim(p.fdeviceip),
         nvl(trim(p.fdesc), '温湿度网络设备')
    from hii.ip_tbs_deviceip p
    left join temp_latest t on t.fdeviceip = trim(p.fdeviceip)
   where trim(p.ftype) = 'HT'
     and (nvl(?, 0) = 0 or trim(p.fhiino) = to_char(?))
)
select u.fdevicekey,
       u.fdevicecode,
       u.fdevicename,
       u.fdevicetype,
       u.fdevicetypecode,
       nvl(c.farea, u.farea) farea,
       nvl(c.fendpoint, u.fendpoint) fendpoint,
       case
         when c.fip is not null then c.fip || case when c.fport is not null then ':' || c.fport end
         else u.fconnection
       end fconnection,
       u.farchivestatus,
       u.frunstatus,
       u.fdatasource,
       u.flastdatatime,
       u.fhiino,
       u.fconnected,
       u.finstid,
       u.fssid,
       u.fdeviceip,
       u.fdetail,
       c.fguid fconfigid,
       case when c.fguid is null then 0 else 1 end fconfigured,
       c.fip fconfigip,
       c.fport fconfigport,
       c.facqperiod,
       c.fwarn,
       c.fstatus fconfigstatus,
       c.fremark fconfigremark,
       to_char(c.fopdt, 'yyyy-mm-dd hh24:mi:ss') fconfigtime
  from unified u
  left join device_config c on c.fdevicekey = u.fdevicekey
 order by u.fdevicetypecode, u.fdevicename, u.fdevicecode~';

  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'N,N,N,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
