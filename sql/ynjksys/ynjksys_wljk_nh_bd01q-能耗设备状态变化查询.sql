declare
 id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob; thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000); resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob; bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
 id:='ynjksys_wljk_nh_bd01q'; name:='物联能耗设备状态变化查询'; direct:='0'; cndxml:='<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>'; cndxsl:=''; thesql:=''; dispsql:=''; param:=''; cfgxml:=''; resulttype:='ntable'; header:=''; footer:='';
 delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
 insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter) values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
 bsql:=q'~with x as (
 select d.fid,trim(d.instid)||'|'||trim(d.fssid) fdeviceid,d.fappmonitordt,nvl(trim(d.fstatus),'0') rawstatus,
 lag(nvl(trim(d.fstatus),'0')) over(partition by trim(d.instid),trim(d.fssid) order by d.fappmonitordt,d.fid) beforestatus
 from hii.ib_tbs_devicemonitorlog d where (nvl(?,0)=0 or d.fhiino=?)
), f as (
 select * from x where beforestatus is not null and beforestatus<>rawstatus
)
select fid frecordid,fdeviceid,to_char(fappmonitordt,'yyyy-mm-dd hh24:mi:ss') fchangetime,
 decode(beforestatus,'1','正常','2','异常','3','关机','4','正常','未知') fbeforestatus,
 decode(rawstatus,'1','正常','2','异常','3','关机','4','正常','未知') fafterstatus,
 rawstatus frawstatus,'设备上报状态码由'||beforestatus||'变更为'||rawstatus freason
from f order by fappmonitordt desc~';
 bsql_pv:='hiino_sql_equal,hiino_sql_equal;'; bsql_pt:='N,N;';
 insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt) values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
