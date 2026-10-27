// Preloaded into the benchmarked process: appends the process's own CPU time (user + system, ms) at exit.
import { appendFileSync } from "node:fs";
process.on("exit", () => {
	const { user, system } = process.cpuUsage();
	if (process.env.BENCH_CPU_FILE) appendFileSync(process.env.BENCH_CPU_FILE, `${(user + system) / 1000}\n`);
});
