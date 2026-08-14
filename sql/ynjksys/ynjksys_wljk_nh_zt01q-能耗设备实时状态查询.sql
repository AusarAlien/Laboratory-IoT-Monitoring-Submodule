declare
 id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob; thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000); resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob; bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
 id:='ynjksys_wljk_nh_zt01q'; name:='物联能耗设备实时状态查询'; direct:='0'; cndxml:='<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>'; cndxsl:=''; thesql:=''; dispsql:=''; param:=''; cfgxml:=''; resulttype:='ntable'; header:=''; footer:='';
 delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
 insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter) values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
 bsql:=q'~with inst as (
 select to_char(instid) instid,max(trim(instnm)) instnm,max(trim(fusedptno)) fdeptno from htlis.lp_tbc_instfile group by to_char(instid)
), r as (
 select d.*,row_number() over(partition by trim(d.instid),trim(d.fssid) order by d.fappmonitordt desc,d.fid) rn
 from hii.ib_tbs_devicemonitorlog d where (nvl(?,0)=0 or d.fhiino=?)
), f as (
 select trim(r.instid)||'|'||trim(r.fssid) fdeviceid,trim(r.instid) finstid,nvl(i.instnm,'设备 '||trim(r.instid)) finstname,
 nvl(i.fdeptno,'未设置') fdeptno,nvl(trim(r.fstatus),'') frawstatus,r.fappmonitordt
 from r left join inst i on i.instid=trim(r.instid) where r.rn=1
)
select fdeviceid,finstid,finstname,fdeptno,frawstatus,
 decode(frawstatus,'1','正常','2','异常','3','关机','4','待机','未知') frawstatusname,
 case when fappmonitordt<sysdate-(180/86400) then '离线' when frawstatus='1' then '正常' when frawstatus='2' then '异常'
      when frawstatus='3' then '关机' when frawstatus='4' then '正常' else '未知' end funifiedstatus,
 case when fappmonitordt<sysdate-(180/86400) then '最后通信时间超过180秒' when frawstatus is null then '设备未上报状态' else '设备状态正常接收' end fstatusdesc,
 to_char(fappmonitordt,'yyyy-mm-dd hh24:mi:ss') flasttime,180 ftimeout,
 case when sysdate-fappmonitordt>=1 then floor(sysdate-fappmonitordt)||'天' else floor((sysdate-fappmonitordt)*24)||'小时' end fduration
from f order by finstname,finstid~';
 bsql_pv:='hiino_sql_equal,hiino_sql_equal;'; bsql_pt:='N,N;';
 insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt) values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
