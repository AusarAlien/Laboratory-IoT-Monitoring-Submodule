declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
begin
  id := 'ynjksys_mjgl_sb01q'; name := '门禁设备选项查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with lab_sn as (
  select trim(l.sn) fsn,
         max(trim(l.labname)) flabname,
         max(trim(l.area)) farea,
         max(trim(l.areaalias)) fareaalias,
         count(distinct trim(l.checktype)) fdirectioncount
    from ib_tbs_labarea l
   where trim(l.sn) is not null
   group by trim(l.sn)
), event_summary as (
  select trim(t.sn) fsn,
         count(*) frecordcount,
         count(distinct trim(t.sensorid)) fsensorcount,
         max(t.checktime) flastchecktime
    from ib_tbs_checkinout t
   where trim(t.sn) is not null
   group by trim(t.sn)
)
select coalesce(l.fsn, e.fsn) fsn,
       l.flabname,
       l.farea,
       l.fareaalias,
       nvl(e.fsensorcount, 0) fsensorcount,
       nvl(e.frecordcount, 0) frecordcount,
       to_char(e.flastchecktime, 'yyyy-mm-dd hh24:mi:ss') flastchecktime
  from lab_sn l
  full join event_summary e on e.fsn = l.fsn
 order by l.farea nulls last, coalesce(l.fsn, e.fsn)~';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,'','',null,null,'RS');
end;
/
commit;
