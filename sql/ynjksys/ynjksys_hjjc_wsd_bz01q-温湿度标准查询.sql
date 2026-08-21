declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_bz01q'; name := '环境项目定义查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select to_char(circuitemid) fstandardid,
       nvl(trim(itemcode),to_char(circuitemid)) fmetriccode,
       nvl(trim(itemname),nvl(trim(itemcode),to_char(circuitemid))) fmetricname,
       trim(itemtype) fitemtype, trim(measureword) funit,
       trim(okvalue1) flowertext, trim(okvalue2) fuppertext,
       trim(valuedef) fdefaultvalue, trim(itemvalue) fitemvalue,
       trim(fifvalid) fstatecode,
       case when trim(fifvalid)='1' then '有效' when trim(fifvalid)='0' then '无效' else nvl(trim(fifvalid),'未设置') end fstate,
       forder, trim(remark) fremark, trim(ftestempid) ftestempid
  from htlis.lp_tbc_circudefm
 order by nvl(forder,999999),circuitemid~';
  bsql_pv := ''; bsql_pt := '';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
