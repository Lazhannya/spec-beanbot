import { type Config } from "$fresh/server.ts";
import { twindv1Config } from "$fresh/plugins/twindv1.ts";

export default {
  plugins: [twindv1Config()],
  build: {
    target: ["chrome99", "firefox99", "safari15"],
  },
} satisfies Config;