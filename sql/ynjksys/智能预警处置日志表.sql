-- 智能预警闭环：处置日志表
-- 先在 HII 业务库执行本脚本，再注册 bj01q/cl01s 两个平台注册 SQL。
create table HII.IB_TBS_IOTALARMDEALLOG
(
  fguid         varchar2(32) not null,
  fmaguid       varchar2(64) not null,
  faction       varchar2(20) not null,
  fresult       varchar2(2000) not null,
  frecovered    varchar2(1) default '0' not null,
  fbeforestatus varchar2(20) not null,
  fafterstatus  varchar2(20) not null,
  fempid        varchar2(20),
  fopdt         date default sysdate not null,
  fhiino        number(12) not null,
  constraint PK_IB_TBS_IOTALARMDEALLOG primary key (FGUID),
  constraint CK_IOTALARMDEAL_ACTION check (FACTION in ('HANDLE','INVALID')),
  constraint CK_IOTALARMDEAL_RECOVER check (FRECOVERED in ('0','1'))
)
tablespace HII;

create index HII.IDX_IOTALARMDEAL_ALARM
  on HII.IB_TBS_IOTALARMDEALLOG (FMAGUID,FOPDT);

create index HII.IDX_IOTALARMDEAL_SCOPE
  on HII.IB_TBS_IOTALARMDEALLOG (FHIINO,FOPDT);

-- 当前流程从“待确认”只能进入一个终态，防止重复点击或并发提交生成两条终态记录。
create unique index HII.UX_IOTALARMDEAL_ONCE
  on HII.IB_TBS_IOTALARMDEALLOG (FMAGUID,FBEFORESTATUS);

comment on table HII.IB_TBS_IOTALARMDEALLOG is '实验室物联智能预警处置日志';
comment on column HII.IB_TBS_IOTALARMDEALLOG.FMAGUID is '关联IP_TBS_MONITORALARM.FMAGUID';
comment on column HII.IB_TBS_IOTALARMDEALLOG.FACTION is 'HANDLE完成处置，INVALID标记失效';
comment on column HII.IB_TBS_IOTALARMDEALLOG.FRESULT is '处置结果或失效原因';
comment on column HII.IB_TBS_IOTALARMDEALLOG.FRECOVERED is '监测状态是否已恢复：1是，0否';
commit;
