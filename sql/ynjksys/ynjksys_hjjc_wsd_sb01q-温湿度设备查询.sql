declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_sb01q'; name := '环境监测对象查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with ctx as (
  select nvl(?,0) hiino from dual
), inst_data as (
  select i.instid, trim(i.instno) instno, trim(i.instnm) instnm,
         trim(i.libseq) libseq, i.fhiino, trim(i.fusedptno) fusedptno,
         trim(i.loaction) loaction, trim(i.environment) environment,
         trim(i.remark) remark, trim(i.fifmonitor) fifmonitor,
         trim(l.libname) libname, trim(l.libadd) libadd,
         trim(l.libno) libno, trim(l.ddptno) ddptno
    from htlis.lp_tbc_instfile i
    cross join ctx c
    left join htlis.lis_libdef l on trim(l.libseq)=trim(i.libseq)
   where (c.hiino=0 or i.fhiino=c.hiino)
     and nvl(trim(i.fifmonitor),'1')<>'0'
), lab_data as (
  select trim(l.libseq) libseq, trim(l.libname) libname, trim(l.libadd) libadd,
         trim(l.libno) libno, trim(l.ddptno) ddptno, trim(l.fifmonitor) fifmonitor
    from htlis.lis_libdef l
    cross join ctx c
   where nvl(trim(l.dfdel),'0')<>'1'
     and nvl(trim(l.fifmonitor),'1')<>'0'
     and (c.hiino=0 or exists (select 1 from inst_data i where i.libseq=trim(l.libseq)))
), object_data as (
  select 'LAB:'||l.libseq fdeviceid, l.libseq fdeviceip,
         nvl(l.libname,'实验室 '||l.libseq) fdevicename,
         nvl(l.libname,nvl(l.libno,l.ddptno)) fdeptno,
         null fhiino, null fdepotseq, l.libadd fdevicedesc,
         '实验室' fdevicetype, nvl(l.libadd,l.libname) flocation,
         'LAB' fobjecttype, l.libseq flibseq, null finstid
    from lab_data l
  union all
  select 'INST:'||to_char(i.instid), nvl(i.instno,to_char(i.instid)),
         nvl(i.instnm,'仪器 '||to_char(i.instid)),
         nvl(i.libname,nvl(i.fusedptno,'未设置')), to_char(i.fhiino), null,
         nvl(i.environment,i.remark), '仪器设备',
         nvl(i.loaction,nvl(i.libadd,i.libname)), 'INST', i.libseq, i.instid
    from inst_data i
)
select fdeviceid,fdeviceip,fdevicename,fdeptno,fhiino,fdepotseq,
       fdevicedesc,fdevicetype,flocation,fobjecttype,flibseq,finstid
  from object_data
 order by fobjecttype,fdeptno,fdevicename,fdeviceip~';
  bsql_pv := 'hiino_sql_equal;'; bsql_pt := 'N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
