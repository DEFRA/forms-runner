import yar from "@hapi/yar";
import config from "../config";
import generateCookiePassword from "../utils/generateCookiePassword";

export default {
  plugin: yar,
  options: {
    cache: {
      expiresIn: config.sessionTimeout,
    },
    cookieOptions: {
      password: config.sessionCookiePassword || generateCookiePassword(),
      isSecure: !!config.isDev,
      isHttpOnly: true,
      isSameSite: "Lax",
    },
  },
};
