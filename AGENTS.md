# 项目交付要求

- 用户要求每次改动都完成三端同步：本地工作区、学校 GitHub 仓库 `Guanlan-Campus-Wall/Campuswall-Web` 的 `main`、正式生产服务器 `/www/wwwroot/campuswall-react`。
- 按 `HANDOFF.md` 的发布流程执行：更新交接文档、测试、提交并推送 `schoolrepo/main`、等待同一提交 CI 通过、生产备份、快进部署、核对公网和三端提交一致。
- 文档补录也必须同步三端；仅同步文档时按交接文档执行，无须重启应用。
- 部署失败或缺少访问权限时如实报告具体阻碍，不得把本地完成表述为三端同步完成。
