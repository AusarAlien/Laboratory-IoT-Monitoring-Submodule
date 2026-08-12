(function(global){
  "use strict";
  var devices=[
    {id:"D-001",code:"IOT-TH-001",name:"理化室温湿度监测器",type:"温湿度监测设备",area:"理化实验室501"},
    {id:"D-002",code:"IOT-TH-002",name:"微生物室温湿度监测器",type:"温湿度监测设备",area:"微生物实验室308"},
    {id:"D-003",code:"IOT-TH-003",name:"样本冷库温湿度监测器",type:"温湿度监测设备",area:"样本冷库"},
    {id:"D-004",code:"IOT-PW-001",name:"检验中心配电监测网关",type:"电气安全监测设备",area:"检验中心"},
    {id:"D-005",code:"IOT-AC-001",name:"理化室门禁控制器",type:"门禁控制器",area:"理化实验室501"},
    {id:"D-006",code:"IOT-WT-001",name:"废物处置间水浸探测器",type:"水浸监测设备",area:"废物处置间"}
  ];
  function pad(n){return String(n).padStart(2,"0");}function stamp(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+" "+pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());}
  function make(){var now=new Date(),results=[],logs=[],metrics={"D-001":[["温度","℃",23.4],["湿度","%RH",52.1]],"D-002":[["温度","℃",25.8],["湿度","%RH",68.2]],"D-003":[["温度","℃",7.3],["湿度","%RH",71.5]],"D-004":[["电压","V",231.6],["电流","A",48.2]],"D-005":[["门状态","",0]],"D-006":[["水浸状态","",0]]};
    for(var i=0;i<46;i++){var dev=devices[i%devices.length],start=new Date(now.getTime()-i*37*60000),failed=i===7||i===23||i===41,batch="B"+stamp(start).replace(/[- :]/g,"")+"-"+pad(i+1),mode=i%3===0?"设备推送":i%3===1?"主动采集":"外部同步";logs.push({id:"L-"+(i+1),batch:batch,deviceId:dev.id,startTime:stamp(start),endTime:stamp(new Date(start.getTime()+(failed?8:2+i%5)*1000)),mode:mode,status:failed?"失败":"成功",rows:failed?0:metrics[dev.id].length,duration:(failed?8:2+i%5)+" 秒",message:failed?(i%2?"连接超时，未获取到有效数据":"设备响应格式校验失败"):"采集完成，数据已写入监测数据集"});if(!failed)metrics[dev.id].forEach(function(m,j){var value=typeof m[2]==="number"?(m[2]+((i%5)-2)*.2).toFixed(1):m[2],quality="正常";if((dev.id==="D-002"&&m[0]==="湿度"&&i%4===1)||(dev.id==="D-003"&&m[0]==="温度"&&i%7===2))quality="超限";results.push({id:"R-"+(i+1)+"-"+j,batch:batch,deviceId:dev.id,time:stamp(new Date(start.getTime()+2000)),metric:m[0],value:String(value),unit:m[1],quality:quality,raw:"{device:"+dev.code+", metric:"+m[0]+", value:"+value+"}"});});}
    return{devices:devices,results:results,logs:logs};
  }
  global.SyswljkCollectionMock=make();
})(window);
