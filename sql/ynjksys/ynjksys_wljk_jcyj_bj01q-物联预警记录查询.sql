declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_jcyj_bj01q'; name := '物联预警记录查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';

  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~with scoped_devices as (
  select trim(p.fdeviceip) fdeviceip,
         trim(p.fdesc) fdevicename,
         trim(p.fname) flocation,
         trim(p.fdptno) fdeptno,
         trim(p.fhiino) fhiino,
         nvl(ltrim(regexp_substr(trim(p.fdeviceip),'[^#]+$'),'0'),'0') fnodecode
    from hii.ip_tbs_deviceip p
   where trim(p.ftype)='HT'
     and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
), unique_devices as (
  select x.*
    from (
      select d.*,
             count(*) over(partition by d.fnodecode) fnodecount,
             row_number() over(partition by d.fnodecode order by d.fdeviceip) rn
        from scoped_devices d
    ) x
   where x.fnodecount=1 and x.rn=1
), latest_deal as (
  select x.*
    from (
      select l.*,
             row_number() over(partition by trim(l.fmaguid) order by l.fopdt desc,l.fguid desc) rn
        from hii.ib_tbs_iotalarmdeallog l
       where (nvl(?,0)=0 or l.fhiino=?)
    ) x
   where x.rn=1
), alarm_data as (
  select trim(a.fmaguid) falarmid,
         trim(a.falarmtype) falarmtypecode,
         case trim(a.falarmtype)
           when '1' then '未关机报警'
           when '2' then '异常值报警'
           when '3' then '离线报警'
           else '其他报警'
         end falarmtype,
         trim(a.fscode) fsourcecode,
         nvl(d.fdeviceip,trim(a.fscode)) fdeviceid,
         nvl(d.fdeviceip,trim(a.fscode)) fdevicecode,
         nvl(d.fdevicename,'环境监测设备') fdevicename,
         nvl(d.flocation,'未匹配') flocation,
         nvl(d.fdeptno,'未设置') fdeptno,
         trim(a.fitemno) fmetriccode,
         nvl(trim(s.fsdname),trim(a.fitemno)) fmetricname,
         trim(s.fsdunit) funit,
         regexp_substr(
           regexp_substr(a.fdes,'监测值[：:][[:space:]]*[-0-9.]+'),
           '[-0-9.]+$'
         ) fvalue,
         trim(a.fdes) fcondition,
         case trim(a.falarmlevel)
           when '1' then '一般'
           when '2' then '重要'
           when '3' then '紧急'
           else nvl(trim(a.falarmlevel),'未设置')
         end flevel,
         case
           when trim(a.fifvalid)='0' then '已失效'
           when trim(a.fifdeal)='0' then '待确认'
           when trim(a.fifdeal)='1' then '已处理'
           else '未知'
         end fstatus,
         trim(a.fifvalid) fifvalid,
         trim(a.fifdeal) fifdeal,
         trim(l.fguid) fdeallogid,
         trim(l.faction) fdealaction,
         trim(l.fresult) fdealresult,
         trim(l.frecovered) frecovered,
         trim(l.fempid) fdealempid,
         l.fopdt fdealdt,
         a.falarmdt,
         d.fhiino
    from hii.ip_tbs_monitoralarm a
    join unique_devices d
      on d.fnodecode=nvl(ltrim(trim(a.fscode),'0'),'0')
    left join hii.ib_tbs_standard s
      on trim(s.fsdid)=trim(a.fitemno)
    left join latest_deal l
      on trim(l.fmaguid)=trim(a.fmaguid)
)
select falarmid,falarmtypecode,falarmtype,fsourcecode,fdeviceid,fdevicecode,
       fdevicename,flocation,fdeptno,fmetriccode,fmetricname,funit,fvalue,
       fcondition,flevel,fstatus,fifvalid,fifdeal,fdeallogid,fdealaction,
       fdealresult,frecovered,fdealempid,
       to_char(fdealdt,'yyyy-mm-dd hh24:mi:ss') fdealtime,
       to_char(falarmdt,'yyyy-mm-dd hh24:mi:ss') falarmtime
  from alarm_data a
 where (? is null or a.falarmtypecode=?)
   and (? is null or a.fmetriccode=? or a.fmetricname=?)
   and (? is null or a.fdeviceid=? or a.fsourcecode=?)
   and (? is null or a.flocation like '%'||?||'%' or a.fdevicename like '%'||?||'%')
   and (? is null or a.flevel=?)
   and (? is null or a.fstatus=?)
   and (? is null or a.falarmdt>=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
   and (? is null or a.falarmdt<=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
 order by a.falarmdt desc,a.falarmid~';

  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,alarm_type_sql_equal,alarm_type_sql_equal,metric_sql_equal,metric_sql_equal,metric_sql_equal,device_sql_equal,device_sql_equal,device_sql_equal,keyword_sql_equal,keyword_sql_equal,keyword_sql_equal,level_sql_equal,level_sql_equal,status_sql_equal,status_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal;';
  bsql_pt := 'N,N,N,N,V,V,V,V,V,V,V,V,V,V,V,V,V,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
