declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_jcyj_cl01s'; name := '物联预警处置保存'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';

  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~insert into hii.ib_tbs_iotalarmdeallog
  (fguid,fmaguid,faction,fresult,frecovered,fbeforestatus,fafterstatus,
   fempid,fopdt,fhiino)
select trim(j.flogid),trim(a.fmaguid),trim(j.faction),trim(j.fresult),
       case when trim(j.frecovered)='1' then '1' else '0' end,
       '待确认',case when trim(j.faction)='HANDLE' then '已处理' else '已失效' end,
       ?,sysdate,nvl(?,0)
  from json_table(?, '$.data[*]'
    columns (
      flogid varchar2(32) path '$.FLOGID',
      fmaguid varchar2(64) path '$.FMAGUID',
      faction varchar2(20) path '$.FACTION',
      fresult varchar2(2000) path '$.FRESULT',
      frecovered varchar2(1) path '$.FRECOVERED'
    )) j
  join hii.ip_tbs_monitoralarm a on trim(a.fmaguid)=trim(j.fmaguid)
 where trim(j.faction) in ('HANDLE','INVALID')
   and length(trim(j.flogid))=32
   and nullif(trim(j.fresult),'') is not null
   and trim(a.fifvalid)='1'
   and trim(a.fifdeal)='0'
   and exists (
     select 1
       from (
         select nvl(ltrim(regexp_substr(trim(p.fdeviceip),'[^#]+$'),'0'),'0') fnodecode,
                count(*) fnodecount
           from hii.ip_tbs_deviceip p
          where trim(p.ftype)='HT'
            and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
          group by nvl(ltrim(regexp_substr(trim(p.fdeviceip),'[^#]+$'),'0'),'0')
       ) d
      where d.fnodecount=1
        and d.fnodecode=nvl(ltrim(trim(a.fscode),'0'),'0')
   )
;
merge into hii.ip_tbs_monitoralarm a
using (
  select trim(j.flogid) flogid,trim(j.fmaguid) fmaguid,trim(j.faction) faction,? fempid
    from json_table(?, '$.data[*]'
      columns (
        flogid varchar2(32) path '$.FLOGID',
        fmaguid varchar2(64) path '$.FMAGUID',
        faction varchar2(20) path '$.FACTION'
      )) j
) s
on (trim(a.fmaguid)=s.fmaguid)
when matched then update set
  a.fifdeal=case when s.faction='HANDLE' then '1' else a.fifdeal end,
  a.fifvalid=case when s.faction='INVALID' then '0' else a.fifvalid end,
  a.fopempid=s.fempid,
  a.fopdt=sysdate
where s.faction in ('HANDLE','INVALID')
  and trim(a.fifvalid)='1'
  and trim(a.fifdeal)='0'
  and exists (
    select 1 from hii.ib_tbs_iotalarmdeallog l
     where trim(l.fguid)=s.flogid and trim(l.fmaguid)=trim(a.fmaguid)
  )
  and exists (
    select 1
      from (
        select nvl(ltrim(regexp_substr(trim(p.fdeviceip),'[^#]+$'),'0'),'0') fnodecode,
               count(*) fnodecount
          from hii.ip_tbs_deviceip p
         where trim(p.ftype)='HT'
           and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
         group by nvl(ltrim(regexp_substr(trim(p.fdeviceip),'[^#]+$'),'0'),'0')
      ) d
     where d.fnodecount=1
       and d.fnodecode=nvl(ltrim(trim(a.fscode),'0'),'0')
  )
;
commit
;
select case when exists (
         select 1
           from hii.ib_tbs_iotalarmdeallog l
          where trim(l.fguid)=trim(j.flogid)
            and trim(l.fmaguid)=trim(j.fmaguid)
            and (nvl(?,0)=0 or l.fhiino=?)
       ) then '预警处置成功' else '预警状态已变化，请刷新后重试' end message
  from json_table(?, '$.data[*]'
    columns (
      flogid varchar2(32) path '$.FLOGID',
      fmaguid varchar2(64) path '$.FMAGUID',
      faction varchar2(20) path '$.FACTION',
      fresult varchar2(2000) path '$.FRESULT'
    )) j~';

  bsql_pv := 'empid_sql_equal,hiino_sql_equal,bodyjson_sql_equal,hiino_sql_equal,hiino_sql_equal;empid_sql_equal,bodyjson_sql_equal,hiino_sql_equal,hiino_sql_equal;;hiino_sql_equal,hiino_sql_equal,bodyjson_sql_equal;';
  bsql_pt := 'V,N,V,N,N;V,V,N,N;;N,N,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
