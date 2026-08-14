declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_jl02q'; name := '温湿度汇总查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with s as (
 select max(case when trim(fsdid)='604' then fsdchekelower end) tl,max(case when trim(fsdid)='604' then fsdchekeceiling end) tu,
        max(case when trim(fsdid)='605' then fsdchekelower end) hl,max(case when trim(fsdid)='605' then fsdchekeceiling end) hu
 from hii.ib_tbs_standard where trim(fsdid) in ('604','605')
),p as (
 select x.* from (select d.*,row_number() over(partition by trim(d.fdeviceip) order by d.depotseq,d.rowid) rn
 from hii.ip_tbs_deviceip d where trim(d.ftype)='HT' and (nvl(?,0)=0 or trim(d.fhiino)=to_char(?))) x where rn=1
),m as (
 select t.fopdt,nvl(trim(p.fid),trim(p.fdeviceip)) fdeviceid,trim(p.fdeviceip) fdeviceip,trim(p.fdptno) fdeptno,'TEMP' metric,
        case when t.ftemper is null then '无效' when t.ftemper<s.tl or t.ftemper>s.tu then '超限' else '正常' end status
 from htlis.lis_chgsampdepot_reqcircu t join p on trim(p.fdeviceip)=trim(t.htdeviceip) cross join s
 union all
 select t.fopdt,nvl(trim(p.fid),trim(p.fdeviceip)),trim(p.fdeviceip),trim(p.fdptno),'HUM',
        case when t.fhumidity is null then '无效' when t.fhumidity<s.hl or t.fhumidity>s.hu then '超限' else '正常' end
 from htlis.lis_chgsampdepot_reqcircu t join p on trim(p.fdeviceip)=trim(t.htdeviceip) cross join s
),f as (
 select * from m where (? is null or fopdt>=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
 and (? is null or fopdt<=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
 and (? is null or fdeviceid=? or fdeviceip=?) and (? is null or fdeptno=?)
 and (? is null or metric=?) and (? is null or status=?)
)
select count(*) frecordcount,count(distinct fdeviceid) fdevicecount,count(distinct metric) fmetriccount,
       sum(case when status='正常' then 1 else 0 end) fnormalcount,
       sum(case when status='超限' then 1 else 0 end) falarmcount,
       sum(case when status='无效' then 1 else 0 end) finvalidcount,
       sum(case when trunc(fopdt)=trunc(sysdate) then 1 else 0 end) ftodaycount
 from f~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal,device_sql_equal,device_sql_equal,device_sql_equal,dept_no_sql_equal,dept_no_sql_equal,metric_sql_equal,metric_sql_equal,status_sql_equal,status_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,V,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
