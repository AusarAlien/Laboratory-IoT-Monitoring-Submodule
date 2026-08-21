declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_pz_sb01s'; name := '物联设备配置保存'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  -- 平台按分号拆分多段 SQL，空参数组在部分版本中会发生错位。
  -- 事务提交使用带会话参数的匿名块，并用 -FH- 表示块内分号，保证三段参数逐段对应。
  bsql := q'~merge into hii.ib_tbs_iotdevicecfg c
using (
  select trim(j.fdevicekey) fdevicekey,
         nullif(trim(j.farea),'') farea,
         nullif(trim(j.fendpoint),'') fendpoint,
         nullif(trim(j.fip),'') fip,
         nullif(trim(j.fport),'') fport,
         to_number(j.facqperiod) facqperiod,
         case when trim(j.fwarn)='1' then '1' else '0' end fwarn,
         case when trim(j.fstatus)='0' then '0' else '1' end fstatus,
         nullif(trim(j.fremark),'') fremark,
         ? fempid,nvl(?,0) fhiino
    from json_table(?, '$.data[*]'
      columns (
        fdevicekey varchar2(400) path '$.FDEVICEKEY',
        farea varchar2(200) path '$.FAREA',
        fendpoint varchar2(300) path '$.FENDPOINT',
        fip varchar2(300) path '$.FIP',
        fport varchar2(20) path '$.FPORT',
        facqperiod varchar2(20) path '$.FACQPERIOD',
        fwarn varchar2(1) path '$.FWARN',
        fstatus varchar2(1) path '$.FSTATUS',
        fremark varchar2(1000) path '$.FREMARK'
      )) j
   where to_number(j.facqperiod) between 1 and 86400
     and (
       exists (
         select 1 from htlis.lp_tbc_instfile lp
          where trim(j.fdevicekey)='INST:'||to_char(lp.instid)
            and nvl(trim(lp.fifmonitor),'1')='1'
            and (nvl(?,0)=0 or lp.fhiino=?)
       )
       or exists (
         select 1 from hii.ib_tbs_devicemonitorlog d
          where trim(j.fdevicekey)='ENERGY:'||trim(d.instid)
            and (nvl(?,0)=0 or d.fhiino=?)
       )
       or exists (
         select 1 from hii.ip_tbs_deviceip p
          where trim(p.ftype)='HT'
            and trim(j.fdevicekey)='ENV:'||nvl(trim(p.fid),to_char(p.depotseq)||':'||trim(p.fdeviceip))
            and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))
       )
     )
) s
on (c.fdevicekey=s.fdevicekey and c.fhiino=s.fhiino)
when matched then update set
  c.farea=s.farea,c.fendpoint=s.fendpoint,c.fip=s.fip,c.fport=s.fport,
  c.facqperiod=s.facqperiod,c.fwarn=s.fwarn,c.fstatus=s.fstatus,
  c.fremark=s.fremark,c.fdeleted='0',c.fempid=s.fempid,c.fopdt=sysdate
when not matched then insert
  (fguid,fdevicekey,farea,fendpoint,fip,fport,facqperiod,fwarn,fstatus,
   fremark,fdeleted,fempid,fopdt,fhiino)
values
  (rawtohex(sys_guid()),s.fdevicekey,s.farea,s.fendpoint,s.fip,s.fport,
   s.facqperiod,s.fwarn,s.fstatus,s.fremark,'0',s.fempid,sysdate,s.fhiino)
;
begin
  if ? is null then null-FH- end if-FH-
  commit-FH-
end
;
select case when exists (
         select 1 from hii.ib_tbs_iotdevicecfg c
          where c.fdevicekey=trim(j.fdevicekey)
            and c.fhiino=nvl(?,0)
            and c.fdeleted='0'
            and c.facqperiod=to_number(j.facqperiod)
            and c.fwarn=trim(j.fwarn)
            and c.fstatus=trim(j.fstatus)
       ) then '物联设备配置保存成功' else '物联设备配置保存失败' end message
  from json_table(?, '$.data[*]'
    columns (
      fdevicekey varchar2(400) path '$.FDEVICEKEY',
      facqperiod varchar2(20) path '$.FACQPERIOD',
      fwarn varchar2(1) path '$.FWARN',
      fstatus varchar2(1) path '$.FSTATUS'
    )) j~';

  bsql_pv := 'empid_sql_equal,hiino_sql_equal,bodyjson_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal;hiino_sql_equal;hiino_sql_equal,bodyjson_sql_equal;';
  bsql_pt := 'V,N,V,N,N,N,N,N,N;N;N,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
