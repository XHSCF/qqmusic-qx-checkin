const STORAGE_KEY = "qqmusic_checkin_request";

(function captureQQMusicCheckinRequest() {
  try {
    const request = typeof $request === "object" && $request ? $request : {};
    const url = String(request.url || "");
    const method = String(request.method || "").toUpperCase();
    const body = String(request.body || "");

    const urlParts = url.match(/^https:\/\/([^/?#]+)(\/[^?#]*)/i);
    const host = urlParts ? String(urlParts[1]).toLowerCase() : "";
    const path = urlParts ? String(urlParts[2]) : "";
    const hasTargetQuery = /[?&]_webcgikey=EveryDaySignLvzScore(?:&|$)/.test(url);

    if (
      method !== "POST" ||
      host !== "u6.y.qq.com" ||
      path !== "/cgi-bin/musics.fcg" ||
      !hasTargetQuery ||
      body.indexOf("EveryDaySignLvzScore") === -1
    ) {
      return;
    }

    const parsedBody = JSON.parse(body);
    const requestData = parsedBody && parsedBody.req_0;
    if (
      !requestData ||
      requestData.module !== "music.lvz.MuFest13TaskSvr" ||
      requestData.method !== "EveryDaySignLvzScore"
    ) {
      return;
    }

    const headers = request.headers && typeof request.headers === "object"
      ? request.headers
      : {};

    function getHeader(name) {
      const wanted = String(name).toLowerCase();
      const keys = Object.keys(headers);
      for (let i = 0; i < keys.length; i += 1) {
        if (String(keys[i]).toLowerCase() === wanted) {
          return String(headers[keys[i]] || "");
        }
      }
      return "";
    }

    const cookie = getHeader("Cookie");
    if (!cookie) {
      throw new Error("MISSING_COOKIE");
    }

    const savedRequest = {
      version: 1,
      url: url,
      method: method,
      headers: {
        Cookie: cookie,
        "User-Agent": getHeader("User-Agent"),
        Referer: getHeader("Referer"),
        Origin: getHeader("Origin"),
        "Content-Type": getHeader("Content-Type")
      },
      body: body,
      capturedAt: new Date().toISOString()
    };

    const saved = $prefs.setValueForKey(
      JSON.stringify(savedRequest),
      STORAGE_KEY
    );

    if (!saved) {
      throw new Error("SAVE_FAILED");
    }

    $notify("QQ音乐签到", "", "签到凭证获取成功");
  } catch (error) {
    $notify("QQ音乐签到", "", "签到凭证获取失败，请重新手动触发");
  } finally {
    $done();
  }
})();
