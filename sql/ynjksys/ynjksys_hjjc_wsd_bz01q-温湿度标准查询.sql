declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
begin
  id := 'ynjksys_hjjc_wsd_bz01q'; name := '温湿度标准查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select trim(fsdid) fstandardid, trim(fsdname) fmetricname,
       trim(fsdelname) fmetricenglish, fsdchekelower flower, fsdchekeceiling fupper,
       trim(fsdunit) funit, trim(fsdstate) fstate,
       case trim(fsdid) when '604' then 'TEMP' when '605' then 'HUM' end fmetriccode
  from hii.ib_tbs_standard
 where trim(fsdid) in ('604','605')
 order by trim(fsdid)~';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,'','',null,null,'RS');
end;
/
commit;
