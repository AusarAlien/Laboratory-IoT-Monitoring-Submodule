declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_mjgl_ry01q'; name := '门禁人员选项查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select u.userid fuserid,
       trim(u.badgenumber) fbadgenumber,
       trim(u.name) fname,
       trim(u.cardno) fcardno,
       u.defaultdeptid fdefaultdeptid,
       u.verificationmethod fverificationmethod,
       u.verifycode fverifycode,
       u.privilege fprivilege,
       case when nvl(u.expires, 0) = 0 then '长期有效' else '限期有效' end fexpirestatus,
       to_char(u.validtimebegin, 'yyyy-mm-dd hh24:mi:ss') fvalidtimebegin,
       to_char(u.validtimeend, 'yyyy-mm-dd hh24:mi:ss') fvalidtimeend,
       case when trim(u.photo) is null then '未登记' else '已登记' end fphotostatus
  from ib_tbs_userinfo u
 where (? is null or lower(trim(u.name)) like '%' || lower(?) || '%'
                   or lower(trim(u.badgenumber)) like '%' || lower(?) || '%'
                   or lower(trim(u.cardno)) like '%' || lower(?) || '%')
 order by trim(u.name), u.userid~';
  bsql_pv := 'person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal;';
  bsql_pt := 'V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
