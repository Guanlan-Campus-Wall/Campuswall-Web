# 项目交付要求

- 用户要求每次改动都完成三端同步：本地工作区、学校 GitHub 仓库 `Guanlan-Campus-Wall/Campuswall-Web` 的 `main`、正式生产服务器 `/www/wwwroot/campuswall-react`。
- 按 `HANDOFF.md` 的发布流程执行：更新交接文档、测试、提交并推送 `schoolrepo/main`、等待同一提交 CI 通过、生产备份、快进部署、核对公网和三端提交一致。
- 文档补录也必须同步三端；仅同步文档时按交接文档执行，无须重启应用。
- 如果 GitHub 因账户限制无法运行 Actions，必须如实记录限制，并在隔离目录和临时测试库中对待部署的同一提交执行 `ci.yml` 中的全部验证命令，保存日志；所有检查通过后才能发布，不得把人工验证标为 GitHub CI 成功。
- 部署失败或缺少访问权限时如实报告具体阻碍，不得把本地完成表述为三端同步完成。

## Codex 贡献署名

- 用户要求为 Codex 的开发贡献署名。由 Codex 协助完成的提交保留用户的作者身份，并在提交消息末尾添加 `Co-authored-by: Codex <267193182+codex@users.noreply.github.com>`；署名只用于 Codex 实际参与的提交。
- 用户同时要求记录 Gemini 与 Codex Review 的贡献。实际使用或采纳对应工具的开发、审查建议时，分别添加 `Co-authored-by: Gemini Code Assist <176961590+gemini-code-assist[bot]@users.noreply.github.com>` 或 `Co-authored-by: Codex Review <199175422+chatgpt-codex-connector[bot]@users.noreply.github.com>`。本次贡献补录提交用于记录维护者要求补录的 Gemini 辅助贡献，以及 PR #1 中已有记录的 Codex Review 审查贡献。
