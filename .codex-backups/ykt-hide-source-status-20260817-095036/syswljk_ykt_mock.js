(function (global) {
  "use strict";
  global.YktData = {
    people: [
      { id: "P-1001", name: "张明", dept: "检验中心理化室", role: "检验人员", cardNo: "A1000861", status: "在职", lastTime: "2026-08-17 10:42:16", lastLocation: "理化实验室501", todayCount: 5, exceptionCount: 0, sources: ["人员管理系统", "门禁系统"] },
      { id: "P-1002", name: "李娟", dept: "检验中心微生物室", role: "检验人员", cardNo: "A1000862", status: "在职", lastTime: "2026-08-17 10:35:08", lastLocation: "PCR试验区", todayCount: 4, exceptionCount: 0, sources: ["人员管理系统", "门禁系统"] },
      { id: "P-1003", name: "王强", dept: "样本管理科", role: "样本管理员", cardNo: "A1000863", status: "在职", lastTime: "2026-08-17 10:18:43", lastLocation: "样本冷库", todayCount: 3, exceptionCount: 1, sources: ["人员管理系统", "门禁系统"] },
      { id: "P-1004", name: "赵敏", dept: "行政办公室", role: "行政人员", cardNo: "A1000864", status: "在职", lastTime: "2026-08-17 09:51:22", lastLocation: "办公区", todayCount: 2, exceptionCount: 0, sources: ["人员管理系统", "访客系统"] },
      { id: "P-1005", name: "陈伟", dept: "废物管理科", role: "处置人员", cardNo: "A1000865", status: "在职", lastTime: "2026-08-17 09:22:15", lastLocation: "废物处置间", todayCount: 3, exceptionCount: 1, sources: ["人员管理系统", "门禁系统"] },
      { id: "P-1006", name: "周洁", dept: "检验中心理化室", role: "实验人员", cardNo: "A1000866", status: "在职", lastTime: "2026-08-17 08:57:31", lastLocation: "理化实验室501", todayCount: 2, exceptionCount: 0, sources: ["人员管理系统", "门禁系统"] }
    ],
    activities: [
      { id: "A-001", time: "2026-08-17 10:42:16", personId: "P-1001", source: "门禁系统", type: "进入实验室", location: "理化实验室501", device: "门禁控制器 AC-501", method: "人脸识别", result: "正常" },
      { id: "A-002", time: "2026-08-17 10:35:08", personId: "P-1002", source: "门禁系统", type: "进入实验室", location: "PCR试验区", device: "门禁控制器 PCR-01", method: "刷卡+密码", result: "正常" },
      { id: "A-003", time: "2026-08-17 10:18:43", personId: "P-1003", source: "门禁系统", type: "离开实验室", location: "样本冷库", device: "冷库读卡器 COLD-01", method: "刷卡", result: "正常" },
      { id: "A-004", time: "2026-08-17 09:51:22", personId: "P-1004", source: "访客系统", type: "访客登记", location: "办公区", device: "访客终端 V-01", method: "数据卡", result: "正常" },
      { id: "A-005", time: "2026-08-17 09:22:15", personId: "P-1005", source: "门禁系统", type: "进入实验室", location: "废物处置间", device: "门禁控制器 WASTE-01", method: "刷卡", result: "异常" },
      { id: "A-006", time: "2026-08-17 08:57:31", personId: "P-1006", source: "门禁系统", type: "进入实验室", location: "理化实验室501", device: "门禁控制器 AC-501", method: "人脸识别", result: "正常" }
    ],
    exceptions: [
      { id: "E-001", time: "2026-08-17 09:22:15", personId: "P-1005", source: "门禁系统", type: "通行失败", location: "废物处置间", level: "重要", status: "待确认", description: "人员数据卡未匹配当前门点通行范围" },
      { id: "E-002", time: "2026-08-17 07:26:49", personId: "P-1003", source: "门禁系统", type: "非工作时段活动", location: "样本冷库", level: "提示", status: "已记录", description: "活动时间不在常规工作时段内" }
    ],
    sources: [
      { id: "SRC-HR", name: "人员管理系统", category: "人员主档", status: "正常", lastTime: "2026-08-17 10:40:00", interval: "实时", todayCount: 6, exceptionCount: 0 },
      { id: "SRC-ACCESS", name: "门禁系统", category: "出入活动", status: "正常", lastTime: "2026-08-17 10:42:16", interval: "实时", todayCount: 17, exceptionCount: 2 },
      { id: "SRC-VISITOR", name: "访客系统", category: "访客活动", status: "正常", lastTime: "2026-08-17 09:51:22", interval: "5分钟", todayCount: 2, exceptionCount: 0 }
    ]
  };
})(window);
