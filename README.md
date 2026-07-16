# QQ音乐成长值签到

## 使用方法

1. 添加远程重写：

   ```text
   https://raw.githubusercontent.com/XHSCF/qqmusic-qx-checkin/main/qqmusic.conf
   ```

2. 开启 Quantumult X 的重写和 MitM。

3. 打开 QQ音乐：`超级会员 → 签到得成长值`。

4. 手动触发一次签到请求，收到“签到凭证获取成功”。

5. 手动运行 `qqmusic_checkin.js` 测试。

6. 添加每天 08:20 的定时任务：

   ```text
   20 8 * * * https://raw.githubusercontent.com/XHSCF/qqmusic-qx-checkin/main/qqmusic_checkin.js, tag=QQ音乐成长值签到, enabled=true
   ```

7. 凭证失效时，重新进入会员签到页面刷新。

8. 第一版采用完整请求原样重放。如果跨天返回 sign 或时间戳失效，后续再分析动态签名。

9. 禁止公开分享 HAR、Cookie、Token 或抓包详情。
