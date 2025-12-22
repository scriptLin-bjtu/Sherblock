// skills/get_crypto_price/index.js
let input = "";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", async () => {
    const params = JSON.parse(input);

    // 1. 获取项目根目录（从 skills/edit_file/ 向上两级）
    const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

    // 2. 拼出要写入的绝对路径（基于项目根目录）
    const target = join(projectRoot, params.file_path);

    // 3. 任意内容（字符串 / Buffer / Uint8Array 都行）
    const data = params.content;

    // 4. 一次性写入
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data, "utf8");

    console.log(
        JSON.stringify({ conetnt: data, result: "write file success" })
    );
});
