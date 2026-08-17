declare
 id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob; thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000); resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob; bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
 id:='ynjksys_wljk_nh_sb01q'; name:='物联能耗设备查询'; direct:='0'; cndxml:='<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>'; cndxsl:=''; thesql:=''; dispsql:=''; param:=''; cfgxml:=''; resulttype:='ntable'; header:=''; footer:='';
 delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
 insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter) values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
 bsql:=q'~with inst as (
  select to_char(instid) instid,max(trim(instno)) instno,max(trim(instnm)) instnm,max(trim(instxh)) instxh,
         max(trim(fusedptno)) fdeptno,max(trim(loaction)) flocation
  from htlis.lp_tbc_instfile group by to_char(instid)
 )
 select trim(d.instid) finstid,nvl(i.instno,trim(d.instid)) fdevicecode,nvl(i.instnm,'设备 '||trim(d.instid)) finstname,
        nvl(i.instxh,'未设置') finstmodel,nvl(i.fdeptno,'未设置') fdeptno,nvl(i.flocation,'未设置') flocation,
        min(trim(d.fssid)) keep(dense_rank last order by d.fappmonitordt) fssid
 from hii.ib_tbs_devicemonitorlog d left join inst i on i.instid=trim(d.instid)
 where (nvl(?,0)=0 or d.fhiino=?)
 group by trim(d.instid),nvl(i.instno,trim(d.instid)),nvl(i.instnm,'设备 '||trim(d.instid)),nvl(i.instxh,'未设置'),
          nvl(i.fdeptno,'未设置'),nvl(i.flocation,'未设置') order by finstname~';
 bsql_pv:='hiino_sql_equal,hiino_sql_equal;'; bsql_pt:='N,N;';
 insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt) values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
