declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_zx01q'; name := '温湿度最新值查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with standards as (
  select max(case when trim(fsdid)='604' then fsdchekelower end) tl,
         max(case when trim(fsdid)='604' then fsdchekeceiling end) tu,
         max(case when trim(fsdid)='605' then fsdchekelower end) hl,
         max(case when trim(fsdid)='605' then fsdchekeceiling end) hu
    from hii.ib_tbs_standard where trim(fsdid) in ('604','605')
), devices as (
  select x.* from (
    select p.*,row_number() over(partition by trim(p.fdeviceip) order by p.depotseq,p.rowid) rn
      from hii.ip_tbs_deviceip p
     where trim(p.ftype)='HT' and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
  ) x where x.rn=1
), metric_data as (
  select to_char(t.fcrseq)||'-TEMP' frecordid,t.fcrseq,nvl(trim(p.fid),trim(p.fdeviceip)) fdeviceid,
         trim(p.fdeviceip) fdeviceip,trim(p.fname) fdevicename,trim(p.fdptno) fdeptno,
         'TEMP' fmetriccode,'温度' fmetricname,t.ftemper fvalue,'℃' funit,
         s.tl flower,s.tu fupper,t.fopdt frecorddt,
         case when t.ftemper is null then '无效' when t.ftemper<s.tl or t.ftemper>s.tu then '超限' else '正常' end fstatus,
         case when t.ftemper<s.tl then '温度低于下限' when t.ftemper>s.tu then '温度超出上限' end falarmdesc
    from htlis.lis_chgsampdepot_reqcircu t join devices p on trim(p.fdeviceip)=trim(t.htdeviceip) cross join standards s
  union all
  select to_char(t.fcrseq)||'-HUM',t.fcrseq,nvl(trim(p.fid),trim(p.fdeviceip)),trim(p.fdeviceip),trim(p.fname),trim(p.fdptno),
         'HUM','湿度',t.fhumidity,'%RH',s.hl,s.hu,t.fopdt,
         case when t.fhumidity is null then '无效' when t.fhumidity<s.hl or t.fhumidity>s.hu then '超限' else '正常' end,
         case when t.fhumidity<s.hl then '湿度低于下限' when t.fhumidity>s.hu then '湿度超出上限' end
    from htlis.lis_chgsampdepot_reqcircu t join devices p on trim(p.fdeviceip)=trim(t.htdeviceip) cross join standards s
), filtered as (
  select m.* from metric_data m
   where (? is null or m.fdeviceid=? or m.fdeviceip=?)
     and (? is null or m.fdeptno=?)
     and (? is null or m.fmetriccode=? or m.fmetricname=?)
     and (? is null or m.fstatus=?)
), ranked as (
  select f.*,row_number() over(partition by fdeviceid,fmetriccode order by frecorddt desc,fcrseq desc) rn from filtered f
)
select frecordid,fcrseq,fdeviceid,fdeviceip,fdevicename,fdeptno,fmetriccode,fmetricname,
       fvalue,funit,flower,fupper,fstatus,falarmdesc,to_char(frecorddt,'yyyy-mm-dd hh24:mi:ss') frecordtime
  from ranked where rn=1 order by fdevicename,fmetriccode~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,device_sql_equal,device_sql_equal,device_sql_equal,dept_no_sql_equal,dept_no_sql_equal,metric_sql_equal,metric_sql_equal,metric_sql_equal,status_sql_equal,status_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
