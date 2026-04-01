import "./instrument.js";
import { app } from "./app.js";
import { config } from "./config/config.js";

app.listen(config.api.port, () => {
  console.log(`Server running on http://localhost:${config.api.port}`);
});
