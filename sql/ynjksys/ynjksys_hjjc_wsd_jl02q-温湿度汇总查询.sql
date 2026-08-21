declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_hjjc_wsd_jl02q'; name := '环境监测记录汇总查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with ctx as (select nvl(?,0) hiino from dual),
inst_data as (
  select i.instid,trim(i.instno) instno,trim(i.instnm) instnm,trim(i.libseq) libseq,
         i.fhiino,trim(i.fusedptno) fusedptno
    from htlis.lp_tbc_instfile i cross join ctx c where c.hiino=0 or i.fhiino=c.hiino
), lab_data as (
  select trim(l.libseq) libseq,trim(l.libname) libname
    from htlis.lis_libdef l cross join ctx c
   where nvl(trim(l.dfdel),'0')<>'1'
     and (c.hiino=0 or exists(select 1 from inst_data i where i.libseq=trim(l.libseq)))
), record_data as (
  select m.testtime frecorddt,
         case when m.instid is not null then 'INST:'||to_char(m.instid) else 'LAB:'||trim(m.libseq) end fdeviceid,
         case when m.instid is not null then nvl(i.instno,to_char(m.instid)) else trim(m.libseq) end fdeviceip,
         nvl(l.libname,nvl(i.fusedptno,'未设置')) fdeptno,
         nvl(trim(c.itemcode),to_char(d.circuitemid)) fmetriccode,
         nvl(trim(d.itemname),nvl(trim(c.itemname),to_char(d.circuitemid))) fmetricname,
         trim(d.ifok) fstatuscode
    from htlis.lis_mcircslog m
    join htlis.lis_dcircslog d on d.circslogseq=m.circslogseq
    cross join ctx x
    left join htlis.lp_tbc_circudefm c on c.circuitemid=d.circuitemid
    left join inst_data i on i.instid=m.instid
    left join lab_data l on l.libseq=trim(m.libseq)
   where x.hiino=0 or i.instid is not null or (m.instid is null and l.libseq is not null)
), filtered as (
  select r.* from record_data r
   where (? is null or r.frecorddt>=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or r.frecorddt<=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or r.fdeviceid=? or r.fdeviceip=?)
     and (? is null or r.fdeptno=?)
     and (? is null or r.fmetriccode=? or r.fmetricname=?)
     and (? is null or r.fstatuscode=?)
)
select count(*) frecordcount,count(distinct fdeviceid) fdevicecount,
       count(distinct fmetriccode) fmetriccount,
       cast(null as number) fnormalcount,cast(null as number) falarmcount,
       sum(case when fstatuscode is null then 1 else 0 end) finvalidcount,
       sum(case when trunc(frecorddt)=trunc(sysdate) then 1 else 0 end) ftodaycount
  from filtered~';
  bsql_pv := 'hiino_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal,device_sql_equal,device_sql_equal,device_sql_equal,dept_no_sql_equal,dept_no_sql_equal,metric_sql_equal,metric_sql_equal,metric_sql_equal,status_sql_equal,status_sql_equal;';
  bsql_pt := 'N,V,V,V,V,V,V,V,V,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
