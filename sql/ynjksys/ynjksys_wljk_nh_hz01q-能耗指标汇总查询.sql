declare
 id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob; thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000); resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob; bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
 id:='ynjksys_wljk_nh_hz01q'; name:='物联能耗指标汇总查询'; direct:='0'; cndxml:='<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>'; cndxsl:=''; thesql:=''; dispsql:=''; param:=''; cfgxml:=''; resulttype:='ntable'; header:=''; footer:='';
 delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
 insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter) values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
 bsql:=q'~with inst as (
 select to_char(instid) instid,max(trim(instnm)) instnm,max(trim(fusedptno)) fdeptno from htlis.lp_tbc_instfile group by to_char(instid)
), b as (
 select trim(d.instid) finstid,nvl(i.fdeptno,'未设置') fdeptno,d.fappmonitordt,d.fstatus,d.fcurrent,d.fvoltage,
        round(d.fpower/1000,4) fpowerkw,d.fttlenergy,d.fttlusetimer,d.fpowerfactor
 from hii.ib_tbs_devicemonitorlog d left join inst i on i.instid=trim(d.instid) where (nvl(?,0)=0 or d.fhiino=?)
), m as (
 select b.*,'CURRENT' metric,fcurrent val from b union all select b.*,'VOLTAGE',fvoltage from b union all
 select b.*,'POWER',fpowerkw from b union all select b.*,'ENERGY',fttlenergy from b union all
 select b.*,'DURATION',fttlusetimer from b union all select b.*,'POWER_FACTOR',fpowerfactor from b
), f as (
 select m.*,case when val is null then '无效' when trim(fstatus)='2' then '超限' else '正常' end status
 from m where (? is null or fappmonitordt>=to_date(?,'yyyy-mm-dd hh24:mi:ss'))
 and (? is null or fappmonitordt<=to_date(?,'yyyy-mm-dd hh24:mi:ss')) and (? is null or finstid=?)
 and (? is null or fdeptno=?) and (? is null or metric=?)
 and (? is null or (case when val is null then '无效' when trim(fstatus)='2' then '超限' else '正常' end)=?)
)
select count(*) frecordcount,count(distinct finstid) fdevicecount,count(distinct metric) fmetriccount,
 sum(case when status='正常' then 1 else 0 end) fnormalcount,sum(case when status='超限' then 1 else 0 end) falarmcount,
 sum(case when status='无效' then 1 else 0 end) finvalidcount,sum(case when trunc(fappmonitordt)=trunc(sysdate) then 1 else 0 end) ftodaycount from f~';
 bsql_pv:='hiino_sql_equal,hiino_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal,device_sql_equal,device_sql_equal,dept_no_sql_equal,dept_no_sql_equal,metric_sql_equal,metric_sql_equal,status_sql_equal,status_sql_equal;';
 bsql_pt:='N,N,V,V,V,V,V,V,V,V,V,V,V,V;';
 insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt) values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
