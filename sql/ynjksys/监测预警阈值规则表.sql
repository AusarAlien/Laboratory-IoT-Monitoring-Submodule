-- 监测预警管理：对象级阈值规则表
-- 先在 HII 业务库执行本脚本，再注册 gz01q/gz01s 两个平台注册 SQL。
create table HII.IB_TBS_IOTWARNRULE
(
  fguid           varchar2(32) not null,
  frulename       varchar2(100) not null,
  fdevicetype     varchar2(40) not null,
  ftargettype     varchar2(20) default 'ALL' not null,
  ftargetid       varchar2(200),
  fitemno         varchar2(20) not null,
  flower          number(18,4),
  fupper          number(18,4),
  fcontcount      number(8) default 1 not null,
  fduration       number(8) default 0 not null,
  falarmlevel     varchar2(20) default '一般' not null,
  fpushplatform   varchar2(1) default '1' not null,
  fstatus         varchar2(1) default '1' not null,
  fdeleted        varchar2(1) default '0' not null,
  feffectivebegin date,
  feffectiveend   date,
  fremark         varchar2(1000),
  fempid          varchar2(20),
  fopdt           date default sysdate not null,
  fhiino          number(12) not null,
  constraint PK_IB_TBS_IOTWARNRULE primary key (FGUID),
  constraint CK_IOTWARNRULE_TARGET check
    (FTARGETTYPE in ('ALL','DEVICE') and
     (FTARGETTYPE='ALL' or FTARGETID is not null)),
  constraint CK_IOTWARNRULE_LIMIT check
    ((FLOWER is not null or FUPPER is not null) and
     (FLOWER is null or FUPPER is null or FLOWER < FUPPER)),
  constraint CK_IOTWARNRULE_COUNT check (FCONTCOUNT >= 1 and FDURATION >= 0),
  constraint CK_IOTWARNRULE_LEVEL check (FALARMLEVEL in ('一般','重要','紧急')),
  constraint CK_IOTWARNRULE_BOOL check
    (FPUSHPLATFORM in ('0','1') and FSTATUS in ('0','1') and FDELETED in ('0','1')),
  constraint CK_IOTWARNRULE_DATE check
    (FEFFECTIVEEND is null or FEFFECTIVEBEGIN is null or FEFFECTIVEEND >= FEFFECTIVEBEGIN)
)
tablespace HII;

create index HII.IDX_IOTWARNRULE_SCOPE
  on HII.IB_TBS_IOTWARNRULE (FHIINO,FSTATUS,FDEVICETYPE,FITEMNO);

create index HII.IDX_IOTWARNRULE_TARGET
  on HII.IB_TBS_IOTWARNRULE (FHIINO,FTARGETTYPE,FTARGETID);

comment on table HII.IB_TBS_IOTWARNRULE is '实验室物联监测对象级阈值规则';
comment on column HII.IB_TBS_IOTWARNRULE.FTARGETTYPE is '适用范围：ALL全部同类设备，DEVICE指定设备';
comment on column HII.IB_TBS_IOTWARNRULE.FTARGETID is '指定设备时保存IP_TBS_DEVICEIP.FDEVICEIP';
comment on column HII.IB_TBS_IOTWARNRULE.FITEMNO is '监测指标，关联IB_TBS_STANDARD.FSDID';
comment on column HII.IB_TBS_IOTWARNRULE.FCONTCOUNT is '连续达到条件的采集次数';
comment on column HII.IB_TBS_IOTWARNRULE.FDURATION is '持续超限时长，单位分钟';
commit;
