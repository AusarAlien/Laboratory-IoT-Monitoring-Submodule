declare
 id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob; thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000); resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob; bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
 id:='ynjksys_wljk_nh_zt01q'; name:='物联能耗设备实时状态查询'; direct:='0'; cndxml:='<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>'; cndxsl:=''; thesql:=''; dispsql:=''; param:=''; cfgxml:=''; resulttype:='ntable'; header:=''; footer:='';
 delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
 insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter) values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
 bsql:=q'~with inst as (
 select to_char(instid) instid,max(trim(instno)) instno,max(trim(instnm)) instnm,max(trim(instxh)) instxh,
        max(trim(fusedptno)) fdeptno,max(trim(loaction)) flocation
 from htlis.lp_tbc_instfile group by to_char(instid)
), history_scope as (
 select distinct trim(d.instid) instid,trim(d.fssid) fssid
 from hii.ib_tbs_devicemonitorlog d where (nvl(?,0)=0 or d.fhiino=?)
), archive_scope as (
 select distinct to_char(lp.instid) instid,trim(s.fssid) fssid
 from hii.ib_tbs_itlastinststatus s join htlis.lp_tbc_instfile lp on lp.instid=s.instid
 where (nvl(?,0)=0 or lp.fhiino=?)
), device_scope as (
 select instid,fssid from history_scope union select instid,fssid from archive_scope
), status_rows as (
 select s.*,row_number() over(partition by s.instid,trim(s.fssid) order by s.fopdt desc nulls last,s.rowid desc) rn
 from hii.ib_tbs_itlastinststatus s join device_scope ds on ds.instid=to_char(s.instid) and ds.fssid=trim(s.fssid)
), history_rows as (
 select d.*,row_number() over(partition by trim(d.instid),trim(d.fssid) order by d.fappmonitordt desc,d.fid desc) rn
 from hii.ib_tbs_devicemonitorlog d join history_scope hs on hs.instid=trim(d.instid) and hs.fssid=trim(d.fssid)
), base as (
 select to_char(s.instid) finstid,trim(s.fssid) fssid,trim(s.fdevicestatus) frawstatus,s.fopdt,
        s.fcurrent,s.fvoltage,s.fpower,s.fttlenergy,s.fttlusetimer,trim(s.fmsg) fmsg,trim(s.fflag) fflag
 from status_rows s where s.rn=1
 union all
 select trim(h.instid),trim(h.fssid),trim(h.fstatus),h.fappmonitordt,
        h.fcurrent,h.fvoltage,h.fpower,h.fttlenergy,h.fttlusetimer,null,null
 from history_rows h where h.rn=1 and not exists (
   select 1 from status_rows s where s.rn=1 and to_char(s.instid)=trim(h.instid) and trim(s.fssid)=trim(h.fssid)
 )
), f as (
 select b.finstid||'|'||b.fssid fdeviceid,b.finstid,nvl(i.instno,b.finstid) fdevicecode,
        nvl(i.instnm,'设备 '||b.finstid) finstname,nvl(i.instxh,'未设置') finstmodel,
        nvl(i.fdeptno,'未设置') fdeptno,nvl(i.flocation,'未设置') flocation,b.fssid,
        nvl(b.frawstatus,'') frawstatus,b.fopdt,b.fcurrent,b.fvoltage,b.fpower,b.fttlenergy,b.fttlusetimer,b.fmsg,b.fflag
 from base b left join inst i on i.instid=b.finstid
)
select fdeviceid,finstid,fdevicecode,finstname,finstmodel,fdeptno,flocation,fssid,frawstatus,
 case when frawstatus in ('1','正常','在线') then '正常' when frawstatus in ('2','异常','故障') then '异常'
      when frawstatus in ('3','关机') then '关机' when frawstatus in ('4','待机') then '待机'
      when frawstatus='离线' then '离线' else '未知' end frawstatusname,
 case when fopdt is null or fopdt<sysdate-(180/86400) then '离线'
      when frawstatus in ('1','正常','在线','4','待机') then '正常'
      when frawstatus in ('2','异常','故障') then '异常'
      when frawstatus in ('3','关机') then '关机'
      when frawstatus='离线' then '离线' else '未知' end funifiedstatus,
 case when fopdt is null then '设备未上报通信时间'
      when fopdt<sysdate-(180/86400) then '最后通信时间超过180秒'
      when fmsg is not null then fmsg
      when frawstatus is null then '设备未上报状态'
      else '设备状态正常接收' end fstatusdesc,
 to_char(fopdt,'yyyy-mm-dd hh24:mi:ss') flasttime,180 ftimeout,
 case when fopdt is null then '--'
      when sysdate-fopdt>=1 then floor(sysdate-fopdt)||'天'
      when sysdate-fopdt>=1/24 then floor((sysdate-fopdt)*24)||'小时'
      else greatest(0,floor((sysdate-fopdt)*1440))||'分钟' end fduration,
 fcurrent,fvoltage,round(fpower/1000,4) fpowerkw,fttlenergy,fttlusetimer,fmsg,fflag
from f order by finstname,finstid,fssid~';
 bsql_pv:='hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal;'; bsql_pt:='N,N,N,N;';
 insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt) values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
