import readline from "node:readline";
import { Readable } from "node:stream";

const input = new Readable({
    read() {},
});

const rl = readline.createInterface({
    input,
    output: process.stdout,
});

rl.on("line", (line) => {
    console.log("收到:", line);
});

// 模拟输入
input.push("第一句\n");
input.push("第二句\n");
input.push(null);
