const STORAGE_KEY = "qqmusic_checkin_request";
let finished = false;

function finish(title, message) {
  if (finished) {
    return;
  }
  finished = true;
  $notify(title, "", message);
  $done();
}

function getResponseText(value) {
  const messages = [];

  function visit(item) {
    if (item === null || item === undefined) {
      return;
    }
    if (typeof item === "string" || typeof item === "number") {
      messages.push(String(item));
      return;
    }
    if (Array.isArray(item)) {
      for (let i = 0; i < item.length; i += 1) {
        visit(item[i]);
      }
      return;
    }
    if (typeof item === "object") {
      const keys = Object.keys(item);
      for (let i = 0; i < keys.length; i += 1) {
        visit(item[keys[i]]);
      }
    }
  }

  visit(value);
  return messages.join(" ").toLowerCase();
}

function getDiagnosticField(value, key) {
  if (
    !value ||
    typeof value !== "object" ||
    !Object.prototype.hasOwnProperty.call(value, key) ||
    value[key] === undefined
  ) {
    return null;
  }
  return value[key];
}

function formatDiagnosticValue(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  return String(value);
}

function sanitizeDiagnosticMessage(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  return String(value)
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/gi, "[redacted]")
    .replace(
      /\b(cookie|token|uin|qq|qqmusic_key|sign)\b\s*[:=]\s*[^\s|,;]+/gi,
      "$1=[redacted]"
    )
    .replace(/\b[1-9][0-9]{4,11}\b/g, "[redacted]")
    .slice(0, 80);
}

try {
  const stored = $prefs.valueForKey(STORAGE_KEY);
  if (!stored) {
    finish(
      "QQ音乐签到失败",
      "请先进入QQ音乐会员签到页面手动触发一次签到接口"
    );
  } else {
    const savedRequest = JSON.parse(stored);
    if (
      !savedRequest ||
      !savedRequest.url ||
      String(savedRequest.method || "").toUpperCase() !== "POST" ||
      !savedRequest.body
    ) {
      finish(
        "QQ音乐签到失败",
        "签到凭证格式异常，请重新进入会员签到页面刷新"
      );
    } else {
      const sourceHeaders = savedRequest.headers || {};
      const headers = {};
      const allowedHeaders = [
        "Cookie",
        "User-Agent",
        "Referer",
        "Origin",
        "Content-Type"
      ];

      for (let i = 0; i < allowedHeaders.length; i += 1) {
        const name = allowedHeaders[i];
        if (sourceHeaders[name]) {
          headers[name] = String(sourceHeaders[name]);
        }
      }

      $task.fetch({
        url: String(savedRequest.url),
        method: "POST",
        headers: headers,
        body: String(savedRequest.body)
      }).then(
        function handleResponse(response) {
          try {
            const status = Number(response.statusCode || response.status || 0);
            if (status === 401 || status === 403) {
              finish(
                "QQ音乐签到失败",
                "登录凭证已失效，请重新进入会员签到页面刷新"
              );
              return;
            }

            const result = JSON.parse(String(response.body || ""));
            const requestResult = result && result.req_0;
            const data = requestResult && requestResult.data;
            const total = data ? Number(data.Total) : NaN;
            const responseText = getResponseText(result);

            const isSuccess =
              result &&
              result.code === 0 &&
              requestResult &&
              requestResult.code === 0 &&
              data &&
              data.Ret === 0;

            if (isSuccess && total > 0) {
              finish("QQ音乐签到成功", "获得 " + total + " 点成长值");
              return;
            }

            const alreadyDone =
              (isSuccess && total === 0) ||
              (result &&
                result.code === 0 &&
                requestResult &&
                requestResult.code === 0 &&
                data &&
                data.Ret === 20019) ||
              responseText.indexOf("今天已经领取过") !== -1 ||
              responseText.indexOf("今日已经领取过") !== -1 ||
              responseText.indexOf("已经领取过") !== -1 ||
              responseText.indexOf("今日已签到") !== -1 ||
              responseText.indexOf("今天已签到") !== -1 ||
              responseText.indexOf("已签到") !== -1 ||
              responseText.indexOf("已经完成") !== -1 ||
              responseText.indexOf("already") !== -1;

            if (alreadyDone) {
              finish("QQ音乐签到", "今日已签到");
              return;
            }

            const loginInvalid =
              responseText.indexOf("cookie") !== -1 ||
              responseText.indexOf("登录") !== -1 ||
              responseText.indexOf("login") !== -1 ||
              responseText.indexOf("unauthorized") !== -1 ||
              responseText.indexOf("forbidden") !== -1;

            if (loginInvalid) {
              finish(
                "QQ音乐签到失败",
                "登录凭证已失效，请重新进入会员签到页面刷新"
              );
              return;
            }

            const signatureInvalid =
              responseText.indexOf("sign") !== -1 ||
              responseText.indexOf("签名") !== -1 ||
              responseText.indexOf("timestamp") !== -1 ||
              responseText.indexOf("时间戳") !== -1 ||
              responseText.indexOf("expired") !== -1 ||
              responseText.indexOf("过期") !== -1;

            if (signatureInvalid) {
              finish(
                "QQ音乐签到失败",
                "签名或时间戳已失效，请重新进入会员签到页面刷新"
              );
              return;
            }

            const httpStatus =
              response.statusCode !== null &&
              response.statusCode !== undefined
                ? response.statusCode
                : response.status;
            const diagnosticMessage = [
              "HTTP=" + formatDiagnosticValue(httpStatus),
              "code=" + formatDiagnosticValue(getDiagnosticField(result, "code")),
              "reqCode=" +
                formatDiagnosticValue(getDiagnosticField(requestResult, "code")),
              "Ret=" + formatDiagnosticValue(getDiagnosticField(data, "Ret")),
              "Total=" + formatDiagnosticValue(getDiagnosticField(data, "Total")),
              "Msg=" + sanitizeDiagnosticMessage(getDiagnosticField(data, "Msg"))
            ].join(" | ");

            finish("QQ音乐签到诊断", diagnosticMessage);
          } catch (error) {
            finish("QQ音乐签到失败", "响应解析失败，请重新抓取签到凭证");
          }
        },
        function handleRequestError() {
          finish("QQ音乐签到失败", "网络请求失败，请稍后重试");
        }
      );
    }
  }
} catch (error) {
  finish("QQ音乐签到失败", "签到凭证读取失败，请重新抓取");
}
