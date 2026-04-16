import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger.js";

const app = createApp();

app.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT}`);
});
