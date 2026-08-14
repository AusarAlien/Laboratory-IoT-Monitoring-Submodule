(function(global){"use strict";
var KEY="syswljk_jcyj_demo_v1",seed={
  devices:[
    {id:"D-001",code:"IOT-TH-001",name:"理化室温湿度监测器",type:"温湿度监测设备",area:"理化实验室501"},
    {id:"D-002",code:"IOT-TH-002",name:"微生物室温湿度监测器",type:"温湿度监测设备",area:"微生物实验室308"},
    {id:"D-003",code:"IOT-TH-003",name:"样本冷库温湿度监测器",type:"温湿度监测设备",area:"样本冷库"},
    {id:"D-004",code:"IOT-PW-001",name:"检验中心配电监测网关",type:"电气安全监测设备",area:"检验中心"}
  ],
  rules:[
    {id:"R-001",name:"微生物室湿度上限预警",type:"温湿度监测设备",deviceId:"D-002",metric:"湿度",operator:"大于",lower:"",upper:"65",unit:"%RH",count:3,duration:5,level:"重要",push:true,status:"启用",updateTime:"2026-08-12 09:20:00"},
    {id:"R-002",name:"样本冷库温度区间预警",type:"温湿度监测设备",deviceId:"D-003",metric:"温度",operator:"区间外",lower:"2",upper:"8",unit:"℃",count:2,duration:3,level:"紧急",push:true,status:"启用",updateTime:"2026-08-12 09:25:00"},
    {id:"R-003",name:"配电电压上限预警",type:"电气安全监测设备",deviceId:"D-004",metric:"电压",operator:"大于",lower:"",upper:"242",unit:"V",count:3,duration:1,level:"紧急",push:true,status:"启用",updateTime:"2026-08-12 09:28:00"}
  ],
  alarms:[
    {id:"A-001",code:"ALM202608120001",time:"2026-08-12 11:34:11",deviceId:"D-002",ruleId:"R-001",level:"重要",metric:"湿度",value:"68.2",unit:"%RH",condition:"> 65%RH",status:"待确认",duration:"28分钟",content:"微生物实验室湿度连续超出上限"},
    {id:"A-002",code:"ALM202608120002",time:"2026-08-12 10:16:20",deviceId:"D-003",ruleId:"R-002",level:"紧急",metric:"温度",value:"9.1",unit:"℃",condition:"区间外 [2, 8]℃",status:"处理中",duration:"1小时 46分钟",content:"样本冷库温度高于允许范围"},
    {id:"A-003",code:"ALM202608120003",time:"2026-08-12 08:42:03",deviceId:"D-004",ruleId:"R-003",level:"紧急",metric:"电压",value:"247.5",unit:"V",condition:"> 242V",status:"已解除",duration:"12分钟",content:"配电监测电压超过上限"},
    {id:"A-004",code:"ALM202608110004",time:"2026-08-11 15:31:14",deviceId:"D-001",ruleId:"R-001",level:"一般",metric:"湿度",value:"71.0",unit:"%RH",condition:"> 70%RH",status:"已关闭",duration:"9分钟",content:"理化实验室湿度短时超限"}
  ],
  pushes:[
    {id:"P-001",alarmId:"A-001",time:"2026-08-12 11:34:13",target:"平台集中预警",status:"推送成功",retry:0,message:"平台已接收，消息编号 MSG-120001"},
    {id:"P-002",alarmId:"A-002",time:"2026-08-12 10:16:22",target:"平台集中预警",status:"推送失败",retry:2,message:"目标平台连接超时"},
    {id:"P-003",alarmId:"A-003",time:"2026-08-12 08:42:05",target:"平台集中预警",status:"推送成功",retry:0,message:"平台已接收，消息编号 MSG-120003"},
    {id:"P-004",alarmId:"A-004",time:"2026-08-11 15:31:16",target:"平台集中预警",status:"待推送",retry:0,message:"等待后台推送任务处理"}
  ]
};
function clone(v){return JSON.parse(JSON.stringify(v));}
function load(){try{var v=JSON.parse(localStorage.getItem(KEY));if(v&&v.rules&&v.alarms&&v.pushes){v.devices=(v.devices||[]).filter(function(x){return x.id!=="D-006";});v.rules=v.rules.filter(function(x){return x.id!=="R-004"&&x.deviceId!=="D-006";});return v;}}catch(e){}return clone(seed);}
function save(v){localStorage.setItem(KEY,JSON.stringify(v));return clone(v);}
global.SyswljkWarningMock={load:load,save:save};
})(window);
