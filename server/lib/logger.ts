import pino from "pino";

// Central logger for the whole app.
// - Console output: pretty, colorized (for humans watching the terminal)
// - File output: structured JSON at logs/app.log (for debugging + log tools)
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: {
    targets: [
      {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        level: process.env.LOG_LEVEL ?? "info",
      },
      {
        target: "pino/file",
        options: { destination: "logs/app.log", mkdir: true },
        level: process.env.LOG_LEVEL ?? "info",
      },
    ],
  },
});
