declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_qs01q'; name := '温湿度趋势查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with devices as (
  select x.* from (
    select p.*,row_number() over(partition by trim(p.fdeviceip) order by p.depotseq,p.rowid) rn
      from hii.ip_tbs_deviceip p
     where trim(p.ftype)='HT' and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
  ) x where x.rn=1
), metric_data as (
  select to_char(t.fcrseq)||'-TEMP' frecordid,t.fcrseq,nvl(trim(p.fid),trim(p.fdeviceip)) fdeviceid,trim(p.fdeviceip) fdeviceip,
         trim(p.fname) fdevicename,trim(p.fdptno) fdeptno,'TEMP' fmetriccode,'温度' fmetricname,
         t.ftemper fvalue,'℃' funit,t.fopdt frecorddt
    from htlis.lis_chgsampdepot_reqcircu t join devices p on trim(p.fdeviceip)=trim(t.htdeviceip)
  union all
  select to_char(t.fcrseq)||'-HUM',t.fcrseq,nvl(trim(p.fid),trim(p.fdeviceip)),trim(p.fdeviceip),trim(p.fname),trim(p.fdptno),
         'HUM','湿度',t.fhumidity,'%RH',t.fopdt
    from htlis.lis_chgsampdepot_reqcircu t join devices p on trim(p.fdeviceip)=trim(t.htdeviceip)
), filtered as (
  select m.* from metric_data m
   where (? is null or m.frecorddt>=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or m.frecorddt<=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or m.fdeviceid=? or m.fdeviceip=?)
     and (? is null or m.fdeptno=?)
     and (? is null or m.fmetriccode=? or m.fmetricname=?)
), limited as (
  select f.*,row_number() over(order by frecorddt desc,fcrseq desc,fmetriccode) rn from filtered f where fvalue is not null
)
select frecordid,fdeviceid,fdeviceip,fdevicename,fdeptno,fmetriccode,fmetricname,fvalue,funit,
       to_char(frecorddt,'yyyy-mm-dd hh24:mi:ss') frecordtime
  from limited where rn<=2000 order by frecorddt,fcrseq,fmetriccode~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal,device_sql_equal,device_sql_equal,device_sql_equal,dept_no_sql_equal,dept_no_sql_equal,metric_sql_equal,metric_sql_equal,metric_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
