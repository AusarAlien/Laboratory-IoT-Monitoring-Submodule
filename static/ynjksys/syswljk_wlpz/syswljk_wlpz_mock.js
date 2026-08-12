(function(global){
  "use strict";
  var KEY="syswljk_wlpz_demo_v1";
  var seed={
    types:[
      {id:"T-TEMP",code:"TEMP_HUM",name:"温湿度监测设备",status:"启用",description:"实验室、冷库及冰箱温湿度监测",updateTime:"2026-08-12 09:20:00",fields:[{key:"ip",name:"设备IP",type:"text",required:true},{key:"port",name:"通信端口",type:"number",required:true},{key:"temperatureMin",name:"温度下限",type:"number",unit:"℃"},{key:"temperatureMax",name:"温度上限",type:"number",unit:"℃"},{key:"humidityMin",name:"湿度下限",type:"number",unit:"%RH"},{key:"humidityMax",name:"湿度上限",type:"number",unit:"%RH"}]},
      {id:"T-POWER",code:"POWER",name:"电气安全监测设备",status:"启用",description:"配电箱电压、电流和漏电监测",updateTime:"2026-08-12 09:20:00",fields:[{key:"ip",name:"网关IP",type:"text",required:true},{key:"port",name:"通信端口",type:"number",required:true},{key:"voltageMax",name:"电压上限",type:"number",unit:"V"},{key:"currentMax",name:"电流上限",type:"number",unit:"A"}]},
      {id:"T-ACCESS",code:"ACCESS",name:"门禁控制器",status:"启用",description:"实验室门禁状态和通行记录接入",updateTime:"2026-08-12 09:20:00",fields:[{key:"ip",name:"控制器IP",type:"text",required:true},{key:"port",name:"通信端口",type:"number",required:true},{key:"doorNo",name:"门编号",type:"text",required:true}]},
      {id:"T-WATER",code:"WATER",name:"水浸监测设备",status:"停用",description:"重点区域漏水监测",updateTime:"2026-08-12 09:20:00",fields:[{key:"ip",name:"网关IP",type:"text",required:true},{key:"port",name:"通信端口",type:"number",required:true},{key:"alarmDelay",name:"报警延迟",type:"number",unit:"秒"}]}
    ],
    areas:[
      {id:"A-ROOT",parentId:"",code:"CENTER",name:"检验中心",description:"检验中心全部物联区域"},
      {id:"A-501",parentId:"A-ROOT",code:"LH-501",name:"理化实验室501",description:"理化检测区域"},
      {id:"A-308",parentId:"A-ROOT",code:"WSW-308",name:"微生物实验室308",description:"微生物检测区域"},
      {id:"A-COLD",parentId:"A-ROOT",code:"COLD-01",name:"样本冷库",description:"样本低温保存区域"},
      {id:"A-WASTE",parentId:"",code:"WASTE",name:"废物处置间",description:"医疗废物暂存区域"}
    ],
    devices:[
      {id:"D-001",code:"IOT-TH-001",name:"理化室温湿度监测器",typeId:"T-TEMP",areaId:"A-501",warning:true,status:"启用",interval:60,owner:"监控管理员",updateTime:"2026-08-12 09:30:00",params:{ip:"172.16.30.21",port:"502",temperatureMin:"18",temperatureMax:"26",humidityMin:"30",humidityMax:"70"}},
      {id:"D-002",code:"IOT-TH-002",name:"微生物室温湿度监测器",typeId:"T-TEMP",areaId:"A-308",warning:true,status:"启用",interval:60,owner:"监控管理员",updateTime:"2026-08-12 09:32:00",params:{ip:"172.16.30.22",port:"502",temperatureMin:"18",temperatureMax:"26",humidityMin:"30",humidityMax:"65"}},
      {id:"D-003",code:"IOT-TH-003",name:"样本冷库温湿度监测器",typeId:"T-TEMP",areaId:"A-COLD",warning:true,status:"启用",interval:30,owner:"系统管理员",updateTime:"2026-08-12 09:34:00",params:{ip:"172.16.30.23",port:"502",temperatureMin:"2",temperatureMax:"8",humidityMin:"20",humidityMax:"75"}},
      {id:"D-004",code:"IOT-PW-001",name:"检验中心配电监测网关",typeId:"T-POWER",areaId:"A-ROOT",warning:true,status:"启用",interval:10,owner:"系统管理员",updateTime:"2026-08-12 09:35:00",params:{ip:"172.16.30.31",port:"1883",voltageMax:"242",currentMax:"80"}},
      {id:"D-005",code:"IOT-AC-001",name:"理化室门禁控制器",typeId:"T-ACCESS",areaId:"A-501",warning:false,status:"启用",interval:15,owner:"安全管理员",updateTime:"2026-08-12 09:36:00",params:{ip:"172.16.30.41",port:"60000",doorNo:"D501"}},
      {id:"D-006",code:"IOT-WT-001",name:"废物处置间水浸探测器",typeId:"T-WATER",areaId:"A-WASTE",warning:false,status:"停用",interval:60,owner:"安全管理员",updateTime:"2026-08-12 09:37:00",params:{ip:"172.16.30.51",port:"502",alarmDelay:"10"}}
    ],
    accounts:[
      {id:"U-001",username:"iot_admin",name:"物联管理员",permissions:["设备配置","区域管理","用户授权","预警设置"],areaIds:["A-ROOT","A-WASTE"],status:"启用",lastLogin:"2026-08-12 08:46:12",updateTime:"2026-08-11 16:12:00"},
      {id:"U-002",username:"lab_viewer",name:"实验室查看员",permissions:["设备查看","状态查看"],areaIds:["A-501","A-308"],status:"启用",lastLogin:"2026-08-11 17:08:31",updateTime:"2026-08-10 10:22:00"},
      {id:"U-003",username:"security_mgr",name:"安全管理员",permissions:["设备查看","预警设置","预警处理"],areaIds:["A-WASTE"],status:"锁定",lastLogin:"2026-08-08 14:21:00",updateTime:"2026-08-12 08:10:00"}
    ]
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function load(){try{var v=JSON.parse(localStorage.getItem(KEY));if(v&&v.types&&v.devices&&v.accounts&&v.areas)return v;}catch(e){}return clone(seed);}
  function save(v){localStorage.setItem(KEY,JSON.stringify(v));return clone(v);}
  global.SyswljkConfigMock={load:load,save:save,reset:function(){localStorage.removeItem(KEY);return load();}};
})(window);
