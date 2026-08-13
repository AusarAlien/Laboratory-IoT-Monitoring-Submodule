declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_mjgl_jl02q'; name := '门禁记录汇总查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with lab_sn as (
  select x.sn, x.area
    from (
      select trim(l.sn) sn, trim(l.area) area,
             row_number() over(partition by trim(l.sn) order by l.fno nulls last, l.rowid) rn
        from ib_tbs_labarea l
       where trim(l.sn) is not null
    ) x
   where x.rn = 1
), filtered as (
  select t.userid, trim(t.checktype) checktype, t.verifycode
    from ib_tbs_checkinout t
    left join ib_tbs_userinfo inf on inf.userid = t.userid
    left join lab_sn l on l.sn = trim(t.sn)
   where (? is null or lower(trim(inf.name)) like '%' || lower(?) || '%'
                     or lower(trim(inf.badgenumber)) like '%' || lower(?) || '%'
                     or lower(trim(inf.cardno)) like '%' || lower(?) || '%')
     and (? is null or l.area = ?)
     and (? is null or trim(t.sn) = ?)
     and (? is null or case trim(t.checktype) when 'I' then '进入' when 'O' then '离开' else trim(t.checktype) end = ?)
     and (? is null or t.verifycode = ?)
     and (? is null or t.checktime >= to_date(?, 'yyyy-mm-dd hh24:mi:ss'))
     and (? is null or t.checktime <= to_date(?, 'yyyy-mm-dd hh24:mi:ss'))
)
select count(*) frecordcount,
       count(distinct userid) fpersoncount,
       sum(case when checktype = 'I' then 1 else 0 end) fentrycount,
       sum(case when checktype = 'O' then 1 else 0 end) fexitcount,
       sum(case when verifycode = 15 then 1 else 0 end) ffacecount
  from filtered~';
  bsql_pv := 'person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal,person_keyword_sql_equal,area_sql_equal,area_sql_equal,sn_sql_equal,sn_sql_equal,check_type_sql_equal,check_type_sql_equal,verify_code_sql_equal,verify_code_sql_equal,start_time_sql_equal,start_time_sql_equal,end_time_sql_equal,end_time_sql_equal;';
  bsql_pt := 'V,V,V,V,V,V,V,V,V,V,N,N,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
