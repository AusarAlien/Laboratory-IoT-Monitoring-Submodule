declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_wljk_jcyj_gz01s'; name := '物联阈值规则保存'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';

  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~update hii.ib_tbs_iotwarnrule r
   set r.fdeleted='1',r.fempid=?,r.fopdt=sysdate
 where r.fguid=json_value(?,'$.data[0].FRULEID')
   and json_value(?,'$.data[0]."数据状态"')='已删'
   and r.fstatus='0'
   and (nvl(?,0)=0 or r.fhiino=?)
;
merge into hii.ib_tbs_iotwarnrule r
using (
  select trim(j.fruleid) fguid,trim(j.frulename) frulename,
         trim(j.fdevicetype) fdevicetype,trim(j.ftargettype) ftargettype,
         nullif(trim(j.ftargetid),'') ftargetid,trim(j.fitemno) fitemno,
         to_number(nullif(trim(j.flower),'')) flower,
         to_number(nullif(trim(j.fupper),'')) fupper,
         to_number(j.fcontcount) fcontcount,to_number(j.fduration) fduration,
         trim(j.falarmlevel) falarmlevel,trim(j.fpushplatform) fpushplatform,
         trim(j.fstatus) fstatus,
         to_date(nullif(trim(j.feffectivebegin),''),'yyyy-mm-dd') feffectivebegin,
         to_date(nullif(trim(j.feffectiveend),''),'yyyy-mm-dd') feffectiveend,
         trim(j.fremark) fremark,? fempid,nvl(?,0) fhiino
    from json_table(?, '$.data[*]'
      columns (
        fdatastatus varchar2(10) path '$."数据状态"',
        fruleid varchar2(32) path '$.FRULEID',frulename varchar2(100) path '$.FRULENAME',
        fdevicetype varchar2(40) path '$.FDEVICETYPE',ftargettype varchar2(20) path '$.FTARGETTYPE',
        ftargetid varchar2(200) path '$.FTARGETID',fitemno varchar2(20) path '$.FITEMNO',
        flower varchar2(40) path '$.FLOWER',fupper varchar2(40) path '$.FUPPER',
        fcontcount varchar2(20) path '$.FCONTCOUNT',fduration varchar2(20) path '$.FDURATION',
        falarmlevel varchar2(20) path '$.FALARMLEVEL',fpushplatform varchar2(1) path '$.FPUSHPLATFORM',
        fstatus varchar2(1) path '$.FSTATUS',feffectivebegin varchar2(10) path '$.FEFFECTIVEBEGIN',
        feffectiveend varchar2(10) path '$.FEFFECTIVEEND',fremark varchar2(1000) path '$.FREMARK'
      )) j
   where j.fdatastatus in ('新增','已改')
) s
on (r.fguid=s.fguid and r.fhiino=s.fhiino)
when matched then update set
  r.frulename=s.frulename,r.fdevicetype=s.fdevicetype,r.ftargettype=s.ftargettype,
  r.ftargetid=s.ftargetid,r.fitemno=s.fitemno,r.flower=s.flower,r.fupper=s.fupper,
  r.fcontcount=s.fcontcount,r.fduration=s.fduration,r.falarmlevel=s.falarmlevel,
  r.fpushplatform=s.fpushplatform,r.fstatus=s.fstatus,
  r.feffectivebegin=s.feffectivebegin,r.feffectiveend=s.feffectiveend,
  r.fremark=s.fremark,r.fempid=s.fempid,r.fdeleted='0',r.fopdt=sysdate
when not matched then insert
  (fguid,frulename,fdevicetype,ftargettype,ftargetid,fitemno,flower,fupper,
   fcontcount,fduration,falarmlevel,fpushplatform,fstatus,fdeleted,feffectivebegin,
   feffectiveend,fremark,fempid,fopdt,fhiino)
values
  (s.fguid,s.frulename,s.fdevicetype,s.ftargettype,s.ftargetid,s.fitemno,s.flower,s.fupper,
   s.fcontcount,s.fduration,s.falarmlevel,s.fpushplatform,s.fstatus,'0',s.feffectivebegin,
   s.feffectiveend,s.fremark,s.fempid,sysdate,s.fhiino)
;
commit
;
select case
         when j.fdatastatus='已删' and exists
              (select 1 from hii.ib_tbs_iotwarnrule r
                where r.fguid=j.fruleid and r.fdeleted='1'
                  and (nvl(?,0)=0 or r.fhiino=?))
           then '阈值规则删除成功'
         when j.fdatastatus in ('新增','已改') and exists
              (select 1 from hii.ib_tbs_iotwarnrule r
                where r.fguid=j.fruleid
                  and (nvl(?,0)=0 or r.fhiino=?)
                  and r.frulename=j.frulename
                  and r.fitemno=j.fitemno
                  and r.fstatus=j.fstatus)
           then '阈值规则保存成功'
         else '阈值规则保存失败'
       end message
  from json_table(?, '$.data[*]'
    columns (
      fdatastatus varchar2(10) path '$."数据状态"',
      fruleid varchar2(32) path '$.FRULEID',frulename varchar2(100) path '$.FRULENAME',
      fitemno varchar2(20) path '$.FITEMNO',fstatus varchar2(1) path '$.FSTATUS'
    )) j~';

  bsql_pv := 'empid_sql_equal,bodyjson_sql_equal,bodyjson_sql_equal,hiino_sql_equal,hiino_sql_equal;empid_sql_equal,hiino_sql_equal,bodyjson_sql_equal;;hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,hiino_sql_equal,bodyjson_sql_equal;';
  bsql_pt := 'V,V,V,N,N;V,N,V;;N,N,N,N,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
