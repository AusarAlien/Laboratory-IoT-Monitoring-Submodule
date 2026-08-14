declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_sb01q'; name := '温湿度设备查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with device_data as (
  select p.*, row_number() over(partition by trim(p.fdeviceip) order by p.depotseq, p.rowid) rn
    from hii.ip_tbs_deviceip p
   where trim(p.ftype) = 'HT'
     and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
)
select nvl(trim(fid),trim(fdeviceip)) fdeviceid, trim(fdeviceip) fdeviceip, trim(fname) fdevicename,
       trim(fdptno) fdeptno, trim(fhiino) fhiino, depotseq fdepotseq,
       trim(fdesc) fdevicedesc, '温湿度监测设备' fdevicetype,
       trim(fname) flocation
  from device_data where rn=1
 order by trim(fname), trim(fdeviceip)~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal;'; bsql_pt := 'N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
