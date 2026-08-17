-- 环境条件采集页面温湿度演示数据
-- 页面：syswljk_hjjc_collection_list
-- 设备档案：HII.IP_TBS_DEVICEIP
-- 采集记录：HTLIS.LIS_CHGSAMPDEPOT_REQCIRCU
--
-- 执行前先查询机构下的温湿度设备数量，并把 c_demo_hiino 改为页面当前机构编号。
-- 当平台当前机构编号确实为 0 时，可保留默认值 0；0 与页面查询一致，表示不限定机构。

select trim(fhiino) fhiino,
       count(distinct trim(fdeviceip)) device_count
  from hii.ip_tbs_deviceip
 where trim(ftype) = 'HT'
 group by trim(fhiino)
 order by device_count desc;

declare
  c_demo_tag constant varchar2(100) := '[IOT_ENV_COLLECTION_DEMO_V1]';
  -- 页面当前机构不是0时，请修改这里；例如：'530000001'。
  c_demo_hiino constant varchar2(20) := '0';
  v_base_seq  number;
  v_row_seq   number := 0;
  v_device_no number := 0;
  v_temp      number(5, 2);
  v_humidity  number(5, 2);
begin
  -- 只清理本脚本此前生成的记录，使脚本可以重复执行，不影响真实采集数据。
  delete from htlis.lis_chgsampdepot_reqcircu
   where fremark like c_demo_tag || '%';

  select nvl(max(fcrseq), 0)
    into v_base_seq
    from htlis.lis_chgsampdepot_reqcircu;

  for d in (
    select depotseq, fdeviceip, fname
      from (
        select depotseq, fdeviceip, fname
          from (
            select p.depotseq,
                   trim(p.fdeviceip) fdeviceip,
                   trim(p.fname) fname,
                   row_number() over(
                     partition by trim(p.fdeviceip)
                     order by p.depotseq, p.rowid
                   ) dedup_rn
             from hii.ip_tbs_deviceip p
             where trim(p.ftype) = 'HT'
               and length(trim(p.fdeviceip)) <= 30
               and (c_demo_hiino = '0' or trim(p.fhiino) = c_demo_hiino)
          )
         where dedup_rn = 1
         order by fname, fdeviceip
      )
     where rownum <= 3
  ) loop
    v_device_no := v_device_no + 1;

    -- 每台设备生成最近5小时30分至当前时间的12个采集点。
    for i in 1 .. 12 loop
      v_row_seq := v_row_seq + 1;
      v_temp := round(20.8 + v_device_no * 0.7 + mod(i, 5) * 0.35, 2);
      v_humidity := round(43 + v_device_no * 2.1 + mod(i, 6) * 1.15, 2);

      -- 第3台设备最后一个温度点高于604温度标准上限40℃，用于演示超限状态。
      if v_device_no = 3 and i = 12 then
        v_temp := 41.80;
      end if;

      insert into htlis.lis_chgsampdepot_reqcircu
        (fcrseq,
         depotseq,
         ftemper,
         fhumidity,
         fopdt,
         fempid,
         fremark,
         htdeviceip,
         fseq)
      values
        (v_base_seq + v_row_seq,
         to_char(d.depotseq),
         v_temp,
         v_humidity,
         sysdate - (12 - i) / 48,
         'IOT_DEMO',
         c_demo_tag || ' DEVICE=' || d.fdeviceip || ' SAMPLE=' || to_char(i, 'FM00'),
         d.fdeviceip,
         v_row_seq);
    end loop;
  end loop;

  if v_device_no = 0 then
    raise_application_error(
      -20001,
      '指定机构下没有FTYPE=HT的温湿度设备，请检查c_demo_hiino。'
    );
  end if;

  commit;
  dbms_output.put_line(
    '已为' || v_device_no || '台设备写入' || v_row_seq || '条温湿度演示采集记录。'
  );
exception
  when others then
    rollback;
    raise;
end;
/

-- 写入结果核对：每条采集记录将在页面中拆分为温度、湿度两个监测指标。
select p.fname,
       t.htdeviceip,
       count(*) sample_count,
       min(t.fopdt) first_time,
       max(t.fopdt) last_time,
       min(t.ftemper) min_temp,
       max(t.ftemper) max_temp,
       min(t.fhumidity) min_humidity,
       max(t.fhumidity) max_humidity
  from htlis.lis_chgsampdepot_reqcircu t
  join (
    select trim(fdeviceip) fdeviceip, min(trim(fname)) fname
      from hii.ip_tbs_deviceip
     where trim(ftype) = 'HT'
     group by trim(fdeviceip)
  ) p
    on p.fdeviceip = trim(t.htdeviceip)
 where t.fremark like '[IOT_ENV_COLLECTION_DEMO_V1]%'
 group by p.fname, t.htdeviceip
 order by p.fname, t.htdeviceip;

-- 如需撤销本脚本生成的演示数据，单独执行以下三行：
-- delete from htlis.lis_chgsampdepot_reqcircu
--  where fremark like '[IOT_ENV_COLLECTION_DEMO_V1]%';
-- commit;
