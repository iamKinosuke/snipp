const path = require("node:path");

const backend = path.join(__dirname, "apps/backend");
const frontend = path.join(__dirname, "apps/frontend");

const nextBin = require.resolve("next/dist/bin/next", { paths: [frontend] });

module.exports = {
  apps: [
    {
      name: "Snipp Api",
      cwd: backend,
      script: "dist/index.js",
      kill_timeout: 10_000,
      max_memory_restart: "400M",
      time: true,
    },
    {
      name: "Snipp Worker",
      cwd: backend,
      script: "dist/worker.js",
      kill_timeout: 20_000,
      max_memory_restart: "300M",
      time: true,
    },
    {
      name: "Snipp Web",
      cwd: frontend,
      script: nextBin,
      args: "start",
      interpreter: "node",
      env: { PORT: "3000" },
      max_memory_restart: "500M",
      time: true,
    },
  ],
};
