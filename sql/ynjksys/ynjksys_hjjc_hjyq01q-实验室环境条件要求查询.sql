declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_hjyq01q'; name := '实验室环境条件要求查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with ctx as (select nvl(?,0) hiino from dual), labs as (
  select trim(l.libseq) libseq,trim(l.libname) libname,trim(l.libadd) libadd,
         trim(l.libno) libno,trim(l.ddptno) ddptno,trim(l.fifmonitor) fifmonitor,
         l.flowtemper,l.ftoptemper,l.flowhumidity,l.ftophumidity,l.flowpressure,l.ftoppressure
    from htlis.lis_libdef l cross join ctx c
   where nvl(trim(l.dfdel),'0')<>'1'
     and (c.hiino=0 or exists(
       select 1 from htlis.lp_tbc_instfile i
        where i.fhiino=c.hiino and trim(i.libseq)=trim(l.libseq)))
), req as (
  select 'LAB:'||libseq||':TEMP' freqid,'LAB:'||libseq fobjectid,libseq,
         libname,libadd,nvl(libname,nvl(libno,ddptno)) fdepartment,
         'TEMP' fprojectcode,'温度' fprojectname,'℃' funit,
         flowtemper flower,ftoptemper fupper,fifmonitor fstatuscode
    from labs where flowtemper is not null or ftoptemper is not null
  union all
  select 'LAB:'||libseq||':HUM','LAB:'||libseq,libseq,libname,libadd,
         nvl(libname,nvl(libno,ddptno)),'HUM','湿度','%',
         flowhumidity,ftophumidity,fifmonitor
    from labs where flowhumidity is not null or ftophumidity is not null
  union all
  select 'LAB:'||libseq||':PRESS','LAB:'||libseq,libseq,libname,libadd,
         nvl(libname,nvl(libno,ddptno)),'PRESS','压力','',
         flowpressure,ftoppressure,fifmonitor
    from labs where flowpressure is not null or ftoppressure is not null
)
select freqid,fobjectid,flibseq,flibname,flibadd,fdepartment,
       fprojectcode,fprojectname,funit,flower,fupper,fstatuscode,
       case when trim(fstatuscode)='0' then '停用' else '启用' end fstatus,
       'LIS_LIBDEF' fsourcetable
  from req order by fdepartment,flibname,fprojectcode~';
  bsql_pv := 'hiino_sql_equal;'; bsql_pt := 'N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
