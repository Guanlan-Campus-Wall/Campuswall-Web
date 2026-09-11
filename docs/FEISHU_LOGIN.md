# 飞书登录（已停用）

> 适用于龙华区观澜中学校园墙。文档更新日期：2026-09-10。
>
> **前台飞书 OAuth 登录已经停用。** 学生使用本校学号注册和登录；格式由服务端校验，前台、公开文档和接口错误都不得写出位数。后台人员继续走 `/admin/login`。
>
> `GET /api/user/feishu/start` 与 `GET /api/user/feishu/callback` 现返回 **410**。
>
> 审核提醒用的仍是**群自定义机器人 Webhook**，见 [NOTIFICATION_INTEGRATION.md](./NOTIFICATION_INTEGRATION.md)。两套凭据不能混用。历史飞书登录环境变量可以留空，不要再申请新的登录应用。

## 当前规则

- 学号格式只在服务端常量中校验。不要在登录页、个人中心、接口错误或公开 README 里写出位数、计数或 `maxLength`。
- 学号注册创建 `pending` 普通用户，审核员在「用户与权限」通过后才能登录。
- 无密码的历史飞书账号不能再走前台登录；需要由具备重置密码权限的管理员补密码。
- 不要把已停用的飞书登录 Secret 写回 Git 或 HANDOFF 正文。
