import { callLLM } from "./services/agent.js";

import { QuestionAgent } from "./agents/questionBot/agent.js";
// console.log(
//     await callLLM({
//         systemPrompt: systemPrompt.prompt1,
//         apiKey: process.env.BIGMODEL_API_KEY,
//         text: `你好吗，不许回答不知道`,
//     })
// );
const questionAgent = new QuestionAgent(callLLM);
questionAgent.run();
