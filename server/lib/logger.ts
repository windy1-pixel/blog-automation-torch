import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

// In production (Coolify) we log plain JSON to stdout: that's what container log
// viewers expect, it needs no extra dependencies, and pino-pretty is a
// devDependency that isn't installed in the production image.
//
// In development we use pretty, colorized console output plus a JSON file at
// logs/app.log for grepping.
export const logger =
  process.env.NODE_ENV === "production"
    ? pino({ level })
    : pino({
        level,
        transport: {
          targets: [
            {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
              level,
            },
            {
              target: "pino/file",
              options: { destination: "logs/app.log", mkdir: true },
              level,
            },
          ],
        },
      });
