declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_jcyj_gz01q'; name := '物联阈值规则查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';

  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~select trim(r.fguid) fruleid,
       trim(r.frulename) frulename,
       trim(r.fdevicetype) fdevicetype,
       trim(r.ftargettype) ftargettype,
       trim(r.ftargetid) ftargetid,
       case when trim(r.ftargettype)='ALL' then '全部同类设备'
            else nvl((select max(nvl(trim(p.fname),trim(p.fdesc)))
                        from hii.ip_tbs_deviceip p
                       where trim(p.fdeviceip)=trim(r.ftargetid)
                         and (nvl(?,0)=0 or trim(p.fhiino)=to_char(?))),
                     trim(r.ftargetid))
        end ftargetname,
       trim(r.fitemno) fitemno,
       nvl(trim(s.fsdname),trim(r.fitemno)) fmetricname,
       trim(s.fsdunit) funit,
       r.flower flower,
       r.fupper fupper,
       r.fcontcount fcontcount,
       r.fduration fduration,
       trim(r.falarmlevel) falarmlevel,
       trim(r.fpushplatform) fpushplatform,
       trim(r.fstatus) fstatus,
       to_char(r.feffectivebegin,'yyyy-mm-dd') feffectivebegin,
       to_char(r.feffectiveend,'yyyy-mm-dd') feffectiveend,
       trim(r.fremark) fremark,
       trim(r.fempid) fempid,
       to_char(r.fopdt,'yyyy-mm-dd hh24:mi:ss') fupdatetime
  from hii.ib_tbs_iotwarnrule r
  left join hii.ib_tbs_standard s on trim(s.fsdid)=trim(r.fitemno)
 where (nvl(?,0)=0 or r.fhiino=?)
   and r.fdeleted='0'
 order by r.fstatus desc,r.fopdt desc,r.fguid~';

  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
