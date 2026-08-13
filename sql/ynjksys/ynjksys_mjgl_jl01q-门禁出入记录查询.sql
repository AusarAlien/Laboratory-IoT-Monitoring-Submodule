declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_mjgl_jl01q'; name := '门禁出入记录查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with lab_exact as (
  select x.*
    from (
      select l.*,
             row_number() over(partition by trim(l.sn), trim(l.checktype)
                               order by l.fno nulls last, l.rowid) rn
        from ib_tbs_labarea l
       where trim(l.sn) is not null
    ) x
   where x.rn = 1
), lab_any as (
  select x.*
    from (
      select l.*,
             row_number() over(partition by trim(l.sn)
                               order by l.fno nulls last, l.rowid) rn
        from ib_tbs_labarea l
       where trim(l.sn) is not null
    ) x
   where x.rn = 1
), base_data as (
  select t.userid fuserid,
         trim(inf.badgenumber) fbadgenumber,
         trim(inf.name) fname,
         trim(inf.cardno) fcardno,
         nvl(trim(le.labname), trim(la.labname)) flabname,
         nvl(trim(le.area), trim(la.area)) farea,
         nvl(trim(le.areaalias), trim(la.areaalias)) fareaalias,
         trim(t.sn) fsn,
         trim(t.sensorid) fsensorid,
         case trim(t.checktype)
           when 'I' then '进入'
           when 'O' then '离开'
           else nvl(trim(t.checktype), '未知')
         end fchecktype,
         t.checktime fcheckdt,
         t.verifycode fverifycode,
         case t.verifycode
           when 15 then '人脸识别'
           else '其他方式(' || to_char(t.verifycode) || ')'
         end fcodetype,
         t.mask_flag fmaskflag,
         t.temperature ftemperature,
         trim(t.workcode) fworkcode,
         trim(t.memoinfo) fmemoinfo
    from ib_tbs_checkinout t
    left join ib_tbs_userinfo inf on inf.userid = t.userid
    left join lab_exact le
      on trim(le.sn) = trim(t.sn)
     and trim(le.checktype) = trim(t.checktype)
    left join lab_any la on trim(la.sn) = trim(t.sn)
), filtered as (
  select b.*
    from base_data b
   where (? is null or lower(b.fname) like '%' || lower(?) || '%'
                     or lower(b.fbadgenumber) like '%' || lower(?) || '%'
                     or lower(b.fcardno) like '%' || lower(?) || '%')
     and (? is null or b.farea = ?)
     and (? is null or b.fsn = ?)
     and (? is null or b.fchecktype = ?)
     and (? is null or b.fverifycode = ?)
     and (? is null or b.fcheckdt >= to_date(?, 'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or b.fcheckdt <= to_date(?, 'yyyy-mm-dd hh24:mi:ss'))
), numbered as (
  select f.*,
         count(*) over() total_count,
         row_number() over(order by f.fcheckdt desc nulls last,
                                    f.fsn, f.fsensorid, f.fuserid) rn
    from filtered f
)
select rn frowseq,
       fuserid,
       fbadgenumber,
       fname,
       fcardno,
       flabname,
       farea,
       fareaalias,
       fsn,
       fsensorid,
       fchecktype,
       to_char(fcheckdt, 'yyyy-mm-dd hh24:mi:ss') fchecktime,
       fverifycode,
       fcodetype,
       fmaskflag,
       ftemperature,
       fworkcode,
       fmemoinfo,
       total_count ftotalcount
  from numbered
 where rn between ((nvl(?,1)-1)*nvl(?,20)+1)
              and (nvl(?,1)*nvl(?,20))
 order by rn~';
  bsql_pv := 'person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal,area_sql_equal,area_sql_equal,sn_sql_equal,sn_sql_equal,check_type_sql_equal,check_type_sql_equal,verify_code_sql_equal,verify_code_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal,page_sql_equal,page_size_sql_equal,page_sql_equal,page_size_sql_equal;';
  bsql_pt := 'V,V,V,V,V,V,V,V,V,V,N,N,V,V,V,V,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
