-- 物联配置管理：设备侧配置表
-- 仪器名称、编号等主档字段保持只读，本表仅保存物联侧覆盖配置。
create table HII.IB_TBS_IOTDEVICECFG
(
  fguid       varchar2(32) not null,
  fdevicekey  varchar2(400) not null,
  farea       varchar2(200),
  fendpoint   varchar2(300),
  fip         varchar2(300),
  fport       varchar2(20),
  facqperiod  number(8) default 60 not null,
  fwarn       varchar2(1) default '1' not null,
  fstatus     varchar2(1) default '1' not null,
  fremark     varchar2(1000),
  fdeleted    varchar2(1) default '0' not null,
  fempid      varchar2(20),
  fopdt       date default sysdate not null,
  fhiino      number(12) not null,
  constraint PK_IB_TBS_IOTDEVICECFG primary key (FGUID),
  constraint UK_IOTDEVICECFG_SCOPE unique (FHIINO,FDEVICEKEY),
  constraint CK_IOTDEVICECFG_PERIOD check (FACQPERIOD between 1 and 86400),
  constraint CK_IOTDEVICECFG_BOOL check
    (FWARN in ('0','1') and FSTATUS in ('0','1') and FDELETED in ('0','1'))
)
tablespace HII;

create index HII.IDX_IOTDEVICECFG_STATUS
  on HII.IB_TBS_IOTDEVICECFG (FHIINO,FSTATUS,FDELETED);

comment on table HII.IB_TBS_IOTDEVICECFG is '实验室物联设备连接、采集和预警配置';
comment on column HII.IB_TBS_IOTDEVICECFG.FDEVICEKEY is '对应物联设备列表FDEVICEKEY稳定键';
comment on column HII.IB_TBS_IOTDEVICECFG.FAREA is '物联侧所属区域覆盖值';
comment on column HII.IB_TBS_IOTDEVICECFG.FENDPOINT is '采集端或终端标识';
comment on column HII.IB_TBS_IOTDEVICECFG.FACQPERIOD is '采集周期，单位秒';
comment on column HII.IB_TBS_IOTDEVICECFG.FWARN is '是否启用设备预警：1是，0否';
comment on column HII.IB_TBS_IOTDEVICECFG.FSTATUS is '配置状态：1启用，0停用';
commit;
